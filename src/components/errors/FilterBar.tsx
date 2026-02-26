'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get('search') ?? ''
  const currentHasAnalysis = searchParams.get('hasAnalysis') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex-1 min-w-48">
        <input
          type="text"
          placeholder="오류 검색..."
          value={currentSearch}
          onChange={(e) => updateParam('search', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">분석:</span>
        <select
          value={currentHasAnalysis}
          onChange={(e) => updateParam('hasAnalysis', e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">전체</option>
          <option value="true">완료</option>
          <option value="false">미완료</option>
        </select>
      </div>
    </div>
  )
}
