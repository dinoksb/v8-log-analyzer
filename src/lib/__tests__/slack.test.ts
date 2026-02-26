import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.hoisted: vi.mock 팩토리보다 먼저 실행되어 클래스 내부에서 참조 가능
const {
  mockConversationsHistory,
  mockConversationsReplies,
  mockUsersInfo,
} = vi.hoisted(() => ({
  mockConversationsHistory: vi.fn(),
  mockConversationsReplies: vi.fn(),
  mockUsersInfo: vi.fn(),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    conversations = {
      history: mockConversationsHistory,
      replies: mockConversationsReplies,
      info: vi.fn(),
    }
    users = { info: mockUsersInfo }
  },
}))

vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token')

import { collectChannelErrors, classifyMessage } from '@/lib/slack'

// ─── 픽스처 헬퍼 ─────────────────────────────────────────────────────────────

function makeMsg(overrides: Partial<{
  ts: string
  text: string
  thread_ts: string
  reply_count: number
  user: string
}> = {}) {
  return {
    ts: overrides.ts ?? '1700000000.000001',
    text: overrides.text ?? 'ERROR: something went wrong',
    thread_ts: overrides.thread_ts,
    reply_count: overrides.reply_count ?? 0,
    user: overrides.user ?? 'U001',
    bot_id: undefined,
    reactions: [],
  }
}

function historyOf(...messages: ReturnType<typeof makeMsg>[]) {
  return { ok: true, messages, response_metadata: { next_cursor: '' } }
}

function repliesOf(...messages: ReturnType<typeof makeMsg>[]) {
  return { ok: true, messages, response_metadata: { next_cursor: '' } }
}

// ─── classifyMessage ──────────────────────────────────────────────────────────

describe('classifyMessage', () => {
  it('critical 키워드를 올바르게 분류한다', () => {
    expect(classifyMessage('CRITICAL: disk full')).toBe('critical')
    expect(classifyMessage('FATAL error occurred')).toBe('critical')
    expect(classifyMessage('OOMKilled pod')).toBe('critical')
  })

  it('high 키워드를 올바르게 분류한다', () => {
    expect(classifyMessage('ERROR: connection refused')).toBe('high')
    expect(classifyMessage('NullPointerException thrown')).toBe('high')
    expect(classifyMessage('request timeout after 30s')).toBe('high')
  })

  it('medium 키워드를 올바르게 분류한다', () => {
    expect(classifyMessage('WARN: deprecated API usage')).toBe('medium')
    expect(classifyMessage('slow query detected')).toBe('medium')
  })

  it('스택트레이스가 있으면 high로 분류한다', () => {
    expect(classifyMessage('at com.example.Service.run(Service.java:42)')).toBe('high')
  })

  it('HTTP 5xx 패턴은 high로 분류한다', () => {
    expect(classifyMessage('response status 503')).toBe('high')
  })

  it('오류 키워드가 없으면 null을 반환한다', () => {
    expect(classifyMessage('배포가 완료되었습니다')).toBeNull()
    expect(classifyMessage('사용자가 로그인했습니다')).toBeNull()
  })
})

// ─── collectChannelErrors ────────────────────────────────────────────────────

describe('collectChannelErrors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUsersInfo.mockResolvedValue({
      ok: true,
      user: { profile: { display_name: 'TestUser' }, name: 'testuser' },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Bug #1: 답글 메시지가 conversations.replies를 중복 호출 ──

  it('[Bug #1] 답글 메시지(threadTs !== ts)는 conversations.replies를 호출하지 않는다', async () => {
    const parentTs = '1700000000.000100'
    const replyTs  = '1700000000.000200'

    mockConversationsHistory.mockResolvedValue(
      historyOf(
        makeMsg({ ts: parentTs, text: 'ERROR: parent', thread_ts: parentTs, reply_count: 1 }),
        // 이 메시지는 답글 — thread_ts가 parentTs, ts가 다름
        makeMsg({ ts: replyTs,  text: 'ERROR: reply',  thread_ts: parentTs, reply_count: 0 }),
      )
    )
    mockConversationsReplies.mockResolvedValue(
      repliesOf(
        makeMsg({ ts: parentTs, text: 'ERROR: parent', thread_ts: parentTs }),
        makeMsg({ ts: replyTs,  text: 'ERROR: reply',  thread_ts: parentTs }),
      )
    )

    const promise = collectChannelErrors('C001', 'test', 1)
    await vi.runAllTimersAsync()
    await promise

    // 부모 메시지 1개 → replies 1번만 호출되어야 한다
    expect(mockConversationsReplies).toHaveBeenCalledTimes(1)
    expect(mockConversationsReplies).toHaveBeenCalledWith({ channel: 'C001', ts: parentTs })
  })

  it('[Bug #1] 서로 다른 스레드 2개면 conversations.replies를 정확히 2번 호출한다', async () => {
    const ts1 = '1700000001.000100'
    const ts2 = '1700000002.000100'

    mockConversationsHistory.mockResolvedValue(
      historyOf(
        makeMsg({ ts: ts1, text: 'ERROR: first',  thread_ts: ts1, reply_count: 2 }),
        makeMsg({ ts: ts2, text: 'ERROR: second', thread_ts: ts2, reply_count: 1 }),
      )
    )
    mockConversationsReplies.mockResolvedValue(
      repliesOf(makeMsg({ text: 'ERROR: reply' }))
    )

    const promise = collectChannelErrors('C001', 'test', 1)
    await vi.runAllTimersAsync()
    await promise

    expect(mockConversationsReplies).toHaveBeenCalledTimes(2)
  })

  // ── Bug #2: 연속 호출 사이 쓰로틀 없음 ──

  it('[Bug #2] 스레드가 여러 개일 때 conversations.replies 호출 사이에 ≥1200ms 지연이 있다', async () => {
    const tsList = ['1700000001.000', '1700000002.000', '1700000003.000']

    mockConversationsHistory.mockResolvedValue(
      historyOf(
        ...tsList.map((ts) =>
          makeMsg({ ts, text: 'ERROR: test', thread_ts: ts, reply_count: 1 })
        )
      )
    )

    const callTimes: number[] = []
    mockConversationsReplies.mockImplementation(async () => {
      callTimes.push(Date.now())
      return repliesOf(makeMsg({ text: 'ERROR: reply' }))
    })

    const promise = collectChannelErrors('C001', 'test', 1)
    await vi.runAllTimersAsync()
    await promise

    expect(callTimes).toHaveLength(3)
    // 두 번째 호출부터 직전과의 간격이 1200ms 이상이어야 한다
    for (let i = 1; i < callTimes.length; i++) {
      expect(callTimes[i] - callTimes[i - 1]).toBeGreaterThanOrEqual(1200)
    }
  })

  // ── 정상 동작 ──

  it('오류 키워드가 없는 메시지는 ErrorEvent를 생성하지 않는다', async () => {
    mockConversationsHistory.mockResolvedValue(
      historyOf(
        makeMsg({ ts: '1700000001.000', text: '배포가 완료되었습니다' }),
        makeMsg({ ts: '1700000002.000', text: '사용자가 로그인했습니다' }),
      )
    )

    const promise = collectChannelErrors('C001', 'test', 1)
    await vi.runAllTimersAsync()
    const { errors } = await promise

    expect(errors).toHaveLength(0)
    expect(mockConversationsReplies).not.toHaveBeenCalled()
  })

  it('스레드가 없는 오류 메시지는 conversations.replies를 호출하지 않는다', async () => {
    mockConversationsHistory.mockResolvedValue(
      historyOf(makeMsg({ ts: '1700000001.000', text: 'ERROR: no thread', reply_count: 0 }))
    )

    const promise = collectChannelErrors('C001', 'test', 1)
    await vi.runAllTimersAsync()
    const { errors } = await promise

    expect(errors).toHaveLength(1)
    expect(mockConversationsReplies).not.toHaveBeenCalled()
  })

  it('반환된 ErrorEvent에 올바른 필드가 포함된다', async () => {
    mockConversationsHistory.mockResolvedValue(
      historyOf(makeMsg({ ts: '1700000001.000100', text: 'CRITICAL: disk full', reply_count: 0 }))
    )

    const promise = collectChannelErrors('C001', 'my-channel', 1)
    await vi.runAllTimersAsync()
    const { errors } = await promise

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      channel: 'C001',
      channelName: 'my-channel',
      title: 'CRITICAL: disk full',
    })
  })
})
