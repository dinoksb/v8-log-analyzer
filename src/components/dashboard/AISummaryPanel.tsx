'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DashboardAnalysis } from '@/lib/types'

type Status = 'idle' | 'loading' | 'loaded' | 'error' | 'empty'

const CACHE_KEY = 'ai_analysis_cache'

interface CacheEntry {
  data: DashboardAnalysis
  cachedAt: string
}

function loadCache(): DashboardAnalysis | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as CacheEntry).data
  } catch {
    return null
  }
}

function saveCache(data: DashboardAnalysis) {
  try {
    const entry: CacheEntry = { data, cachedAt: new Date().toISOString() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage 쓰기 실패는 무시
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4 space-y-2">
        <div className="h-5 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-2 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${72 - i * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AISummaryPanel() {
  const [status, setStatus] = useState<Status>('idle')
  const [analysis, setAnalysis] = useState<DashboardAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchAnalysis = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/analysis/overview')
      if (res.status === 404) {
        setStatus('empty')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as DashboardAnalysis
      saveCache(data)
      setAnalysis(data)
      setStatus('loaded')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [])

  // 마운트 시 캐시가 있으면 API 호출 없이 표시, 없을 때만 1회 분석
  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setAnalysis(cached)
      setStatus('loaded')
      return
    }
    void fetchAnalysis()
  }, [fetchAnalysis])

  // 데이터 수집 완료 이벤트 수신 → 캐시 무효화 후 재분석
  useEffect(() => {
    const handleDataCollected = () => {
      clearCache()
      void fetchAnalysis()
    }
    window.addEventListener('slack-data-collected', handleDataCollected)
    return () => window.removeEventListener('slack-data-collected', handleDataCollected)
  }, [fetchAnalysis])

  const handleReanalyze = useCallback(() => {
    clearCache()
    void fetchAnalysis()
  }, [fetchAnalysis])

  const headerAction = (
    <Button
      variant="ghost"
      size="sm"
      loading={status === 'loading'}
      onClick={handleReanalyze}
      disabled={status === 'loading'}
    >
      재분석
    </Button>
  )

  return (
    <Card title="AI 분석 요약" action={headerAction}>
      {status === 'loading' && <Skeleton />}

      {status === 'empty' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          수집된 데이터가 없습니다. 먼저 Slack 메시지를 수집해 주세요.
        </p>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          <Button variant="secondary" size="sm" onClick={fetchAnalysis}>
            다시 시도
          </Button>
        </div>
      )}

      {status === 'loaded' && analysis && (
        <div className="space-y-5">
          {/* Headline */}
          <div className="rounded-md border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 leading-snug">
              {analysis.headline}
            </p>
          </div>

          {/* Overview */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.overview}
          </p>

          {/* Insights */}
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 dark:text-gray-600 pt-1">
            분석 시각: {new Date(analysis.analyzedAt).toLocaleString('ko-KR')}
          </p>
        </div>
      )}
    </Card>
  )
}
