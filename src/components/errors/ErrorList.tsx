'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ErrorEvent } from '@/lib/types'
import { ErrorCard } from './ErrorCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

interface Props {
  errors: ErrorEvent[]
  total: number
  page: number
  totalPages: number
  pageSize: number
}

export function ErrorList({ errors, total, page, totalPages }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (errors.length === 0) {
    return (
      <EmptyState
        title="오류가 없습니다"
        description="필터를 변경하거나 채널에서 데이터를 수집해 주세요."
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>총 {total}개 오류</span>
        <span>{page} / {totalPages} 페이지</span>
      </div>
      <div className="space-y-2">
        {errors.map((error) => (
          <ErrorCard key={error.id} error={error} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
