'use client'

import { useState, useRef, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SlackChannel } from '@/lib/types'
import { Job } from '@/lib/jobStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

interface Props {
  initialChannels: SlackChannel[]
}

interface FetchResult {
  channelId: string
  errorCount: number
  success: boolean
  error?: string
}

const STEP_LABEL: Record<string, string> = {
  init: '준비 중',
  messages: '메시지 수집',
  filter: '오류 필터링',
  threads: '스레드 수집',
  done: '완료',
  error: '오류',
}

const STORAGE_KEY = 'channelFetcher_jobs'

function getStoredJobs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function setStoredJob(channelId: string, jobId: string) {
  const stored = getStoredJobs()
  stored[channelId] = jobId
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

function clearStoredJob(channelId: string) {
  const stored = getStoredJobs()
  delete stored[channelId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function ChannelFetcher({ initialChannels }: Props) {
  const [days, setDays] = useState(7)
  const [jobs, setJobs] = useState<Record<string, Job>>({})
  const [results, setResults] = useState<Record<string, FetchResult>>({})
  const router = useRouter()
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // 마운트 시 localStorage에 저장된 진행 중 jobId 복원
  useEffect(() => {
    const stored = getStoredJobs()
    for (const [channelId, jobId] of Object.entries(stored)) {
      startPolling(jobId, channelId)
    }
    const refs = pollRefs.current
    return () => {
      // 언마운트 시 모든 폴링 정리 (서버 작업은 계속 실행됨)
      Object.values(refs).forEach(clearInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startPolling = (jobId: string, channelId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/slack/fetch/status/${jobId}`)
        if (!res.ok) return
        const job = (await res.json()) as Job

        setJobs((prev) => ({ ...prev, [channelId]: job }))

        if (job.status === 'done') {
          clearInterval(pollRefs.current[channelId])
          delete pollRefs.current[channelId]
          clearStoredJob(channelId)
          // 결과를 먼저 렌더링한 뒤 낮은 우선순위로 router refresh
          setResults((prev) => ({
            ...prev,
            [channelId]: {
              channelId,
              errorCount: job.result?.errorCount ?? 0,
              success: true,
            },
          }))
          startTransition(() => router.refresh())
        } else if (job.status === 'error') {
          clearInterval(pollRefs.current[channelId])
          delete pollRefs.current[channelId]
          clearStoredJob(channelId)
          setResults((prev) => ({
            ...prev,
            [channelId]: {
              channelId,
              errorCount: 0,
              success: false,
              error: job.error,
            },
          }))
        }
      } catch {
        // 네트워크 오류 시 다음 폴링에서 재시도
      }
    }, 1500)

    pollRefs.current[channelId] = interval
  }

  const fetchChannel = async (channel: SlackChannel) => {
    // 기존 폴링 정리
    if (pollRefs.current[channel.id]) {
      clearInterval(pollRefs.current[channel.id])
      delete pollRefs.current[channel.id]
    }

    setJobs((prev) => ({
      ...prev,
      [channel.id]: {
        id: '',
        channelId: channel.id,
        channelName: channel.name,
        status: 'pending',
        progress: { step: 'init', current: 0, total: 0, message: '수집 요청 중...' },
        startedAt: new Date().toISOString(),
      },
    }))
    setResults((prev) => {
      const next = { ...prev }
      delete next[channel.id]
      return next
    })

    try {
      const res = await fetch('/api/slack/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, channelName: channel.name, days }),
      })
      const data = (await res.json()) as { jobId?: string; error?: string }

      if (!res.ok || !data.jobId) {
        setJobs((prev) => {
          const next = { ...prev }
          delete next[channel.id]
          return next
        })
        setResults((prev) => ({
          ...prev,
          [channel.id]: { channelId: channel.id, errorCount: 0, success: false, error: data.error },
        }))
        return
      }

      setStoredJob(channel.id, data.jobId)
      startPolling(data.jobId, channel.id)
    } catch (err) {
      setJobs((prev) => {
        const next = { ...prev }
        delete next[channel.id]
        return next
      })
      setResults((prev) => ({
        ...prev,
        [channel.id]: {
          channelId: channel.id,
          errorCount: 0,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }))
    }
  }

  if (!initialChannels.length) {
    return (
      <EmptyState
        title="채널 없음"
        description="SLACK_BOT_TOKEN을 설정하고 봇을 채널에 초대해 주세요."
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-sm font-medium text-gray-700">수집 기간:</span>
        <div className="flex gap-2">
          {[1, 3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {initialChannels.map((channel) => {
          const result = results[channel.id]
          const job = jobs[channel.id]
          const isRunning = job && (job.status === 'pending' || job.status === 'running')

          return (
            <div
              key={channel.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">#{channel.name}</span>
                  {channel.isMember && <Badge variant="success">참여중</Badge>}
                  {channel.numMembers !== undefined && (
                    <span className="text-xs text-gray-400">{channel.numMembers}명</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {result && !isRunning && (
                    <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success
                        ? `${result.errorCount}개 오류 수집됨`
                        : `오류: ${result.error}`}
                    </span>
                  )}
                  {channel.isMember && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={isRunning}
                      disabled={!!Object.values(pollRefs.current).length && !isRunning}
                      onClick={() => fetchChannel(channel)}
                    >
                      수집
                    </Button>
                  )}
                </div>
              </div>

              {/* 진행 상태 표시 */}
              {isRunning && job.progress && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-indigo-600">
                      {STEP_LABEL[job.progress.step] ?? job.progress.step}
                    </span>
                    <span>{job.progress.message}</span>
                  </div>
                  {job.progress.total > 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((job.progress.current / job.progress.total) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                  {job.progress.total === 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
