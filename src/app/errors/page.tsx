import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { FilterBar } from '@/components/errors/FilterBar'
import { ErrorList } from '@/components/errors/ErrorList'
import { Spinner } from '@/components/ui/Spinner'
import { getStorageAdapter } from '@/lib/storage/factory'
import { filterErrors, paginateErrors } from '@/lib/analysis'
import type { PaginatedErrors } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<Record<string, string>>
}

async function getErrors(searchParams: Record<string, string>): Promise<PaginatedErrors | null> {
  try {
    const storage = getStorageAdapter()
    let errors = await storage.loadAllErrorEvents()
    errors = errors.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    const hasAnalysisParam = searchParams.hasAnalysis
    const filtered = filterErrors(errors, {
      channel: searchParams.channel,
      search: searchParams.search,
      hasAnalysis: hasAnalysisParam === undefined ? undefined : hasAnalysisParam === 'true',
    })

    const page = parseInt(searchParams.page ?? '1', 10)
    const pageSize = parseInt(searchParams.pageSize ?? '20', 10)
    const { errors: paginated, total, totalPages } = paginateErrors(filtered, page, pageSize)

    return { errors: paginated, total, page, pageSize, totalPages }
  } catch {
    return null
  }
}

async function ErrorsContent({ searchParams }: { searchParams: Record<string, string> }) {
  const data = await getErrors(searchParams)

  if (!data) {
    return <p className="text-sm text-gray-400">데이터를 불러올 수 없습니다.</p>
  }

  return (
    <ErrorList
      errors={data.errors}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      pageSize={data.pageSize}
    />
  )
}

export default async function ErrorsPage({ searchParams }: Props) {
  const sp = await searchParams

  return (
    <>
      <Header title="오류 목록" description="수집된 모든 오류와 AI 분석 현황" />
      <PageContainer>
        <div className="space-y-4">
          <Suspense fallback={null}>
            <FilterBar />
          </Suspense>
          <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
            <ErrorsContent searchParams={sp} />
          </Suspense>
        </div>
      </PageContainer>
    </>
  )
}
