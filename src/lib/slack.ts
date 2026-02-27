import { WebClient, type ConversationsHistoryArguments } from '@slack/web-api'
import {
  SlackChannel,
  SlackMessage,
  SlackReaction,
  SlackThread,
  ErrorEvent,
  SlackFetchData,
  Agent8ErrorDetail,
} from '@/lib/types'
import { slackTsToDate, extractErrorTitle, extractTags } from '@/lib/utils'

const TARGET_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? 'C097DFK0E1K'

const ERROR_KEYWORDS = [
  'CRITICAL', 'FATAL', 'OutOfMemory', 'OOMKilled', 'outage', 'P0',
  'ERROR', 'Exception', 'timeout', 'crash', '500', 'P1',
  'WARN', 'Warning', 'deprecated', 'slow', 'retry', 'P2',
]

function getClient(token?: string): WebClient {
  const tok = token ?? process.env.SLACK_BOT_TOKEN
  if (!tok) throw new Error('SLACK_BOT_TOKEN is not set')
  return new WebClient(tok)
}

export async function getTargetChannel(token?: string): Promise<SlackChannel> {
  const client = getClient(token)
  const res = await client.conversations.info({ channel: TARGET_CHANNEL_ID })
  const ch = res.channel
  if (!ch?.id || !ch.name) throw new Error(`Channel ${TARGET_CHANNEL_ID} not found`)
  return {
    id: ch.id,
    name: ch.name,
    isMember: (ch as Record<string, unknown>).is_member as boolean ?? false,
    topic: (ch.topic as { value?: string } | undefined)?.value,
    purpose: (ch.purpose as { value?: string } | undefined)?.value,
  }
}

export async function listChannels(token?: string): Promise<SlackChannel[]> {
  const client = getClient(token)
  const channels: SlackChannel[] = []
  let cursor: string | undefined

  do {
    const res = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200,
      cursor,
    })

    const members = res.channels ?? []
    for (const ch of members) {
      if (!ch.id || !ch.name) continue
      channels.push({
        id: ch.id,
        name: ch.name,
        isMember: ch.is_member ?? false,
        numMembers: ch.num_members,
        topic: ch.topic?.value,
        purpose: ch.purpose?.value,
      })
    }

    cursor = res.response_metadata?.next_cursor
  } while (cursor)

  return channels
}

const userNameCache = new Map<string, string>()

export async function resolveUserName(userId: string, client: WebClient): Promise<string> {
  if (userNameCache.has(userId)) return userNameCache.get(userId)!

  try {
    const res = await client.users.info({ user: userId })
    const name =
      res.user?.profile?.display_name ||
      res.user?.profile?.real_name ||
      res.user?.name ||
      userId
    userNameCache.set(userId, name)
    return name
  } catch {
    userNameCache.set(userId, userId)
    return userId
  }
}

function parseReactions(raw: unknown[]): SlackReaction[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r) => {
    const reaction = r as Record<string, unknown>
    return {
      name: String(reaction.name ?? ''),
      count: Number(reaction.count ?? 0),
    }
  })
}

const CRITICAL_KEYWORDS = ['CRITICAL', 'FATAL', 'OutOfMemory', 'OOMKilled', 'outage', 'P0']
const HIGH_KEYWORDS = ['ERROR', 'Exception', 'timeout', 'crash', '500', 'P1']
const MEDIUM_KEYWORDS = ['WARN', 'Warning', 'deprecated', 'slow', 'retry', 'P2']

export type ErrorSeverity = 'critical' | 'high' | 'medium'

export function classifyMessage(text: string): ErrorSeverity | null {
  const upperText = text.toUpperCase()

  for (const keyword of CRITICAL_KEYWORDS) {
    if (upperText.includes(keyword.toUpperCase())) return 'critical'
  }

  const stackTracePattern = /at\s+\w+[\w.]+\s*\(|Traceback\s+\(most recent|Exception in thread/i
  const httpErrorPattern = /\b5\d{2}\b/

  for (const keyword of HIGH_KEYWORDS) {
    if (upperText.includes(keyword.toUpperCase())) return 'high'
  }
  if (stackTracePattern.test(text) || httpErrorPattern.test(text)) return 'high'

  for (const keyword of MEDIUM_KEYWORDS) {
    if (upperText.includes(keyword.toUpperCase())) return 'medium'
  }

  return null
}

export async function fetchAndParseErrorDetail(
  channelId: string,
  ts: string,
  token?: string
): Promise<Agent8ErrorDetail> {
  const thread = await fetchThread(channelId, ts, token)
  if (!thread) return {}

  const mainMsg = thread.parentMessage
  return parseAgent8Detail(mainMsg, thread)
}

export function isErrorMessage(text: string): boolean {
  const upperText = text.toUpperCase()

  for (const keyword of ERROR_KEYWORDS) {
    if (upperText.includes(keyword.toUpperCase())) return true
  }

  const stackTracePattern = /at\s+\w+[\w.]+\s*\(|Traceback\s+\(most recent|Exception in thread/i
  if (stackTracePattern.test(text)) return true

  const httpErrorPattern = /\b5\d{2}\b/
  if (httpErrorPattern.test(text)) return true

  return false
}

export type ProgressCallback = (progress: {
  step: string
  current: number
  total: number
  message: string
}) => void

export async function fetchChannelHistory(
  channelId: string,
  options: {
    token?: string
    oldest?: string
    latest?: string
    limit?: number
    onProgress?: ProgressCallback
  } = {}
): Promise<SlackMessage[]> {
  const client = getClient(options.token)
  const messages: SlackMessage[] = []
  let cursor: string | undefined
  let page = 0

  const args: ConversationsHistoryArguments = {
    channel: channelId,
    oldest: options.oldest,
    latest: options.latest,
    limit: 200,
    cursor,
  }

  do {
    if (cursor) args.cursor = cursor

    const res = await client.conversations.history(args)
    const rawMessages = res.messages ?? []
    page++

    const resolved = await Promise.all(
      rawMessages
        .filter((msg) => !!msg.ts)
        .map(async (msg) => {
          const userId = msg.user ?? msg.bot_id ?? 'unknown'
          const userName = userId !== 'unknown' && !msg.bot_id
            ? await resolveUserName(userId, client)
            : (msg.username ?? msg.bot_id ?? 'Bot')
          return {
            ts: msg.ts!,
            userId,
            userName,
            text: msg.text ?? '',
            isBot: !!msg.bot_id || msg.subtype === 'bot_message',
            reactions: parseReactions((msg.reactions as unknown[]) ?? []),
            replyCount: msg.reply_count ?? 0,
            threadTs: msg.thread_ts,
            rawBlocks: (msg as Record<string, unknown>).blocks as unknown[] | undefined ?? [],
          } satisfies SlackMessage
        })
    )
    messages.push(...resolved)

    console.log(`[Fetch] 메시지 수집 중... (페이지 ${page}, 누적 ${messages.length}개)`)
    options.onProgress?.({
      step: 'messages',
      current: messages.length,
      total: 0,
      message: `메시지 수집 중... (${messages.length}개)`,
    })

    cursor = res.response_metadata?.next_cursor
  } while (cursor)

  return messages
}

export async function fetchThread(
  channelId: string,
  threadTs: string,
  token?: string
): Promise<SlackThread | null> {
  const client = getClient(token)

  try {
    const res = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
    })

    const msgs = res.messages ?? []
    if (!msgs.length) return null

    const toSlackMessage = async (msg: (typeof msgs)[number]): Promise<SlackMessage> => {
      const rawMsg = msg as Record<string, unknown>
      const userId = msg.user ?? msg.bot_id ?? 'unknown'
      const userName = userId !== 'unknown' && !msg.bot_id
        ? await resolveUserName(userId, client)
        : ((rawMsg.username as string | undefined) ?? msg.bot_id ?? 'Bot')

      return {
        ts: msg.ts ?? '',
        userId,
        userName,
        text: msg.text ?? '',
        isBot: !!msg.bot_id || rawMsg.subtype === 'bot_message',
        reactions: parseReactions((msg.reactions as unknown[]) ?? []),
        replyCount: msg.reply_count ?? 0,
        threadTs: msg.thread_ts,
        rawBlocks: (rawMsg.blocks as unknown[] | undefined) ?? [],
      }
    }

    const [parent, ...replies] = await Promise.all(msgs.map(toSlackMessage))

    return {
      parentMessage: parent,
      replies,
    }
  } catch {
    return null
  }
}

const THREAD_CONCURRENCY = 2  // rate limit 방지: 동시 요청 수를 낮게 유지
const MAX_THREAD_FETCH = 20   // Vercel 60s 제한 내 완료 가능한 최대 스레드 수

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0

  async function worker(): Promise<void> {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}

export async function collectChannelErrors(
  channelId: string,
  channelName: string,
  days: number,
  token?: string,
  dateRange?: { oldest: string; latest?: string },
  onProgress?: ProgressCallback
): Promise<{ errors: ErrorEvent[]; fetchData: SlackFetchData }> {
  // days 기반 수집 시 KST 자정 기준으로 정렬: "N일" = N개 달력 날짜.
  // Date.now() - N*24h 방식은 수집 시각에 따라 당일 초반 메시지가 잘리는 문제가 있다.
  const oldest = dateRange?.oldest ?? (() => {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const [y, m, d] = kstNow.toISOString().slice(0, 10).split('-').map(Number)
    const startLocal = new Date(y, m - 1, d - (days - 1))
    const startStr = [
      startLocal.getFullYear(),
      String(startLocal.getMonth() + 1).padStart(2, '0'),
      String(startLocal.getDate()).padStart(2, '0'),
    ].join('-')
    return String(Math.floor(new Date(`${startStr}T00:00:00+09:00`).getTime() / 1000))
  })()
  const latest = dateRange?.latest

  const effectiveDays = dateRange
    ? Math.max(1, Math.ceil(
        ((latest ? Number(latest) : Date.now() / 1000) - Number(oldest)) / (60 * 60 * 24)
      ))
    : days

  const oldestKST = new Date(Number(oldest) * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  console.log(`[Fetch] #${channelName} 수집 시작 — oldest=${oldest} (${oldestKST}), days=${days}, dateRange=${JSON.stringify(dateRange)}`)
  onProgress?.({ step: 'messages', current: 0, total: 0, message: '채널 히스토리 수집 중...' })

  const messages = await fetchChannelHistory(channelId, { token, oldest, latest, onProgress })

  const sortedTs = [...messages].sort((a, b) => a.ts.localeCompare(b.ts))
  console.log(`[Fetch] 메시지 ${messages.length}개 수집 완료 — 첫: ${sortedTs[0]?.ts} 마지막: ${sortedTs.at(-1)?.ts}`)
  onProgress?.({ step: 'filter', current: 0, total: messages.length, message: `메시지 ${messages.length}개 필터링 중...` })

  // Count error candidates to show accurate thread progress
  const errorCandidates = messages.filter((m) => {
    const isReply = m.threadTs && m.threadTs !== m.ts
    if (isReply) return false
    // msg.text가 비어있는 블록 전용 메시지도 블록 텍스트로 재검사
    const blockText = (m.rawBlocks ?? []).map(getBlockText).filter(Boolean).join('\n')
    const fullText = [m.text, blockText].filter(Boolean).join('\n')
    return isErrorMessage(fullText)
  })
  // Vercel 60s 타임아웃 방지: 스레드는 가장 최근 MAX_THREAD_FETCH개만 수집.
  // 나머지 오류는 목록에는 표시되며, 개별 refresh-detail 로 스레드 조회 가능.
  const allNeedingThreads = errorCandidates.filter((m) => m.replyCount > 0)
  const msgsNeedingThreads = [...allNeedingThreads]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, MAX_THREAD_FETCH)
  const threadsToFetch = msgsNeedingThreads.length
  console.log(`[Fetch] 오류 후보 ${errorCandidates.length}개, 스레드 ${allNeedingThreads.length}개 중 최근 ${threadsToFetch}개 수집`)
  let threadsFetched = 0
  const threadFetchTasks = msgsNeedingThreads.map((msg) => async () => {
    const fetched = await fetchThread(channelId, msg.ts, token)
    const current = ++threadsFetched
    console.log(`[Fetch] 스레드 수집 중: ${current}/${threadsToFetch} (ts=${msg.ts})`)
    onProgress?.({
      step: 'threads',
      current,
      total: threadsToFetch,
      message: `스레드 수집 중: ${current}/${threadsToFetch}`,
    })
    return { ts: msg.ts, thread: fetched }
  })

  const threadResults = await runWithConcurrency(threadFetchTasks, THREAD_CONCURRENCY)
  const threads: Record<string, SlackThread> = {}
  for (const { ts, thread } of threadResults) {
    if (thread) threads[ts] = thread
  }

  const errors: ErrorEvent[] = []

  for (const msg of errorCandidates) {
    const thread = threads[msg.ts]
    const errorDetail = parseAgent8Detail(msg, thread)

    const event: ErrorEvent = {
      id: `err_${channelId}_${msg.ts.replace('.', '_')}`,
      channel: channelId,
      channelName,
      title: extractErrorTitle(msg.text),
      rawText: msg.text,
      ts: msg.ts,
      occurredAt: slackTsToDate(msg.ts).toISOString(),
      userId: errorDetail.userId ?? msg.userId,
      userName: msg.userName,
      isBot: msg.isBot,
      thread,
      tags: extractTags(msg.text),
      errorDetail: Object.keys(errorDetail).length > 0 ? errorDetail : undefined,
    }

    errors.push(event)
  }

  errors.sort((a, b) => b.ts.localeCompare(a.ts))

  console.log(`[Fetch] #${channelName} 완료: 오류 ${errors.length}개 수집됨`)
  onProgress?.({
    step: 'done',
    current: errors.length,
    total: errors.length,
    message: `완료: ${errors.length}개 오류 수집됨`,
  })

  const fetchData: SlackFetchData = {
    channelId,
    channelName,
    fetchedAt: new Date().toISOString(),
    days: effectiveDays,
    messages,
    threads,
    errors,
  }

  return { errors, fetchData }
}

function getBlockText(block: unknown): string | undefined {
  const b = block as Record<string, unknown>
  const textObj = b.text as Record<string, unknown> | undefined
  return textObj?.text as string | undefined
}

function parseAgent8Detail(mainMsg: SlackMessage, thread?: SlackThread): Agent8ErrorDetail {
  const detail: Agent8ErrorDetail = {}

  // 메인 메시지 블록에서 context 추출: "*{message}*\n\n*Context:* {context}"
  for (const block of mainMsg.rawBlocks ?? []) {
    const text = getBlockText(block)
    if (!text) continue
    const ctxMatch = text.match(/\*Context:\*\s*(.+?)(\n|$)/)
    if (ctxMatch && ctxMatch[1].trim() !== 'N/A') {
      detail.context = ctxMatch[1].trim()
    }
  }

  // 쓰레드 상세 블록 파싱
  for (const reply of thread?.replies ?? []) {
    for (const block of reply.rawBlocks ?? []) {
      const b = block as Record<string, unknown>
      const text = getBlockText(block)

      if (text) {
        // JSON 에러 상세: "```json\n{...}\n```"
        const jsonMatch = text.match(/```json\n([\s\S]+?)\n?```/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>
            if (parsed.name) detail.name = String(parsed.name)
            if (parsed.message) detail.errorMessage = String(parsed.message)
            if (parsed.stack) detail.stack = String(parsed.stack)
            if (parsed.prompt) detail.prompt = String(parsed.prompt)
            if (parsed.process) detail.process = String(parsed.process)
            if (parsed.elapsedTime !== undefined) detail.elapsedTime = Number(parsed.elapsedTime)
            if (parsed.version) detail.version = String(parsed.version)
            if (parsed.time) detail.time = String(parsed.time)
          } catch {
            // JSON 파싱 실패 시 무시
          }
        }

        // Sentry 이벤트 ID 추출
        const sentryMatch = text.match(/`([0-9a-f-]{32,36})`/)
        if (sentryMatch) detail.sentryEventId = sentryMatch[1]
      }

      // fields 배열에서 userId / url / userAgent 추출
      const fields = b.fields as Array<Record<string, unknown>> | undefined
      if (fields) {
        for (const field of fields) {
          const ft = field.text as string | undefined
          if (!ft) continue
          const userIdMatch = ft.match(/\*User ID:\*\n(.+)/)
          if (userIdMatch) detail.userId = userIdMatch[1].trim()
          const urlMatch = ft.match(/\*URL:\*\n(.+)/)
          if (urlMatch) detail.url = urlMatch[1].trim()
          const uaMatch = ft.match(/\*User Agent:\*\n(.+)/)
          if (uaMatch) detail.userAgent = uaMatch[1].trim()
        }
      }
    }
  }

  return detail
}
