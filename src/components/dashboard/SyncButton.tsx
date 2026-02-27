'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { SlackChannel } from '@/lib/types'

interface SyncResult {
  newErrorCount: number
  isFirstSync: boolean
  syncedFrom: string
  fetchedAt: string
}

export function SyncButton() {
  const [channel, setChannel] = useState<SlackChannel | null>(null)
  const [channelLoading, setChannelLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/slack/channels')
      .then((r) => r.json())
      .then((data: { channels?: SlackChannel[] }) => {
        if (data.channels?.[0]) setChannel(data.channels[0])
      })
      .catch(() => {})
      .finally(() => setChannelLoading(false))
  }, [])

  const handleSync = async () => {
    if (!channel) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/slack/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          channelName: channel.name,
        }),
      })
      const data = (await res.json()) as {
        newErrorCount?: number
        isFirstSync?: boolean
        syncedFrom?: string
        fetchedAt?: string
        error?: string
      }
      if (!res.ok || data.error) throw new Error(data.error ?? '동기화 실패')
      setResult({
        newErrorCount: data.newErrorCount ?? 0,
        isFirstSync: data.isFirstSync ?? false,
        syncedFrom: data.syncedFrom ?? '',
        fetchedAt: new Date().toLocaleTimeString('ko-KR'),
      })
      window.dispatchEvent(new CustomEvent('slack-data-collected'))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">동기화</span>
        {channel && !channelLoading && (
          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">#{channel.name}</span>
        )}
        <Button
          size="sm"
          loading={loading}
          disabled={channelLoading || !channel}
          onClick={handleSync}
          className="ml-auto"
        >
          {channelLoading ? '채널 로딩 중...' : '지금 동기화'}
        </Button>
      </div>

      {result && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">
            {result.fetchedAt} — {result.newErrorCount}개 신규 오류 수집 완료
            {result.isFirstSync && ' (오늘 KST 자정부터 수집)'}
          </span>
        </div>
      )}
      {error && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}
    </div>
  )
}
