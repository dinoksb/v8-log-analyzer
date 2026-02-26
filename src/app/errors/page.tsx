import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { FilterBar } from '@/components/errors/FilterBar'
import { ErrorList } from '@/components/errors/ErrorList'
import { Spinner } from '@/components/ui/Spinner'
import { PaginatedErrors } from '@/lib/types'

interface Props {
  searchParams: Promise<Record<string, string>>
}

async function getErrors(searchParams: Record<string, string>): Promise<PaginatedErrors | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const params = new URLSearchParams(searchParams)
    const res = await fetch(`${baseUrl}/api/errors?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json() as Promise<PaginatedErrors>
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
      <Header
        title="오류 목록"
        description="수집된 모든 오류와 AI 분석 현황"
      />
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
