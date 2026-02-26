'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  channelId: string
  channelName: string
}

const PERIOD_OPTIONS = [
  { value: 1,  label: '1일' },
  { value: 3,  label: '3일' },
  { value: 7,  label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
]

export function DashboardFetcher({ channelId, channelName }: Props) {
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ errorCount: number; fetchedAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/slack/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, channelName, days }),
      })
      const data = (await res.json()) as { errorCount?: number; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? '수집 실패')
      setResult({ errorCount: data.errorCount ?? 0, fetchedAt: new Date().toLocaleTimeString('ko-KR') })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">수집 기간</span>
      <div className="flex gap-1">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDays(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              days === value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Button size="sm" loading={loading} onClick={handleFetch} className="ml-auto">
        #{channelName} 수집
      </Button>
      {result && (
        <span className="text-xs text-green-600">
          {result.fetchedAt} — {result.errorCount}개 오류 수집됨
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
