'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { SlackChannel } from '@/lib/types'

interface FetchResult {
  errorCount: number
  fetchedAt: string
}

const MAX_COLLECT_DAYS = 3

const QUICK_PERIODS = [
  { label: '오늘', days: 0 },
  { label: '3일', days: 3 },
]

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function DateRangeFetcher() {
  const today = toDateString(new Date())
  const threeDaysAgo = toDateString(new Date(Date.now() - MAX_COLLECT_DAYS * 24 * 60 * 60 * 1000))

  const [startDate, setStartDate] = useState(threeDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [activeQuick, setActiveQuick] = useState<number | null>(MAX_COLLECT_DAYS)
  const [channel, setChannel] = useState<SlackChannel | null>(null)
  const [channelLoading, setChannelLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FetchResult | null>(null)
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

  const applyQuickPeriod = (days: number) => {
    const end = new Date()
    const start = days === 0 ? new Date() : new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setStartDate(toDateString(start))
    setEndDate(toDateString(end))
    setActiveQuick(days)
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setActiveQuick(null)
    if (field === 'start') {
      setStartDate(value)
      const maxEnd = addDays(value, MAX_COLLECT_DAYS)
      if (endDate > maxEnd) setEndDate(maxEnd < today ? maxEnd : today)
    } else {
      const minStart = addDays(value, -MAX_COLLECT_DAYS)
      if (startDate < minStart) setStartDate(minStart)
      setEndDate(value)
    }
  }

  const handleFetch = async () => {
    if (!channel) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/slack/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channel.id,
          channelName: channel.name,
          startDate,
          endDate,
        }),
      })
      const data = (await res.json()) as { errorCount?: number; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? '수집 실패')
      setResult({
        errorCount: data.errorCount ?? 0,
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
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">기간별 로그 재수집</span>
        {channel && !channelLoading && (
          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">#{channel.name}</span>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">최대 {MAX_COLLECT_DAYS}일</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 빠른 기간 선택 */}
        <div className="flex gap-1">
          {QUICK_PERIODS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => applyQuickPeriod(days)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeQuick === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 날짜 범위 직접 입력 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:[color-scheme:dark]"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">~</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={(() => { const m = addDays(startDate, MAX_COLLECT_DAYS); return m < today ? m : today })()}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:[color-scheme:dark]"
          />
        </div>

        <Button
          size="sm"
          loading={loading}
          disabled={channelLoading || !channel || !startDate || !endDate}
          onClick={handleFetch}
          className="ml-auto"
        >
          {channelLoading ? '채널 로딩 중...' : '수집 시작'}
        </Button>
      </div>

      {result && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">
            {result.fetchedAt} — {result.errorCount}개 오류 수집 완료
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
