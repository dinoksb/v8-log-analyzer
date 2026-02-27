'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { ViewPeriod } from '@/lib/types'

interface Props {
  currentView: ViewPeriod
}

const PERIOD_OPTIONS: { label: string; value: ViewPeriod }[] = [
  { label: '오늘', value: '1d' },
  { label: '3일', value: '3d' },
  { label: '7일', value: '7d' },
  { label: '30일', value: '30d' },
  { label: '전체', value: 'all' },
]

export function DashboardViewFilter({ currentView }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelect = useCallback(
    (value: ViewPeriod) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="flex gap-1" role="group" aria-label="기간 선택">
      {PERIOD_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleSelect(value)}
          aria-pressed={currentView === value}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            currentView === value
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
