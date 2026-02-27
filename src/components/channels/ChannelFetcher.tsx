'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlackChannel } from '@/lib/types'
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

export function ChannelFetcher({ initialChannels }: Props) {
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, FetchResult>>({})
  const router = useRouter()

  const fetchChannel = async (channel: SlackChannel) => {
    setLoading((prev) => ({ ...prev, [channel.id]: true }))
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
      const data = (await res.json()) as { errorCount?: number; success?: boolean; error?: string }

      if (!res.ok || !data.success) {
        setResults((prev) => ({
          ...prev,
          [channel.id]: {
            channelId: channel.id,
            errorCount: 0,
            success: false,
            error: data.error ?? '수집 실패',
          },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          [channel.id]: {
            channelId: channel.id,
            errorCount: data.errorCount ?? 0,
            success: true,
          },
        }))
        router.refresh()
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [channel.id]: {
          channelId: channel.id,
          errorCount: 0,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [channel.id]: false }))
    }
  }

  if (!initialChannels.length) {
    return (
      <EmptyState
        title="채널 없음"
        description="SLACK_BOT_TOKEN을 설정하고 봇을 채널에 초대해 주세요."
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
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
          const isLoading = loading[channel.id]

          return (
            <div key={channel.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">#{channel.name}</span>
                  {channel.isMember && <Badge variant="success">참여중</Badge>}
                  {channel.numMembers !== undefined && (
                    <span className="text-xs text-gray-400">{channel.numMembers}명</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {result && !isLoading && (
                    <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? `${result.errorCount}개 오류 수집됨` : `오류: ${result.error}`}
                    </span>
                  )}
                  {channel.isMember && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={isLoading}
                      disabled={isLoading}
                      onClick={() => fetchChannel(channel)}
                    >
                      수집
                    </Button>
                  )}
                </div>
              </div>

              {isLoading && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
                  </div>
                  <p className="text-xs text-gray-500">Slack 메시지 수집 중... (최대 1분 소요)</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
