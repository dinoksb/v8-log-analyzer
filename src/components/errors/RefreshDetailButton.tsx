'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Agent8ErrorDetail } from '@/lib/types'

interface Props {
  errorId: string
  onRefresh?: (detail: Agent8ErrorDetail) => void
}

export function RefreshDetailButton({ errorId, onRefresh }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/errors/${errorId}/refresh-detail`, { method: 'POST' })
      const data = (await res.json()) as { errorDetail?: Agent8ErrorDetail; error?: string }

      if (!res.ok) {
        setError(data.error ?? '상세 정보 로드 실패')
        return
      }

      if (data.errorDetail && onRefresh) {
        onRefresh(data.errorDetail)
      }

      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {loading ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Slack에서 로딩 중...
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Slack에서 상세 정보 로드
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
