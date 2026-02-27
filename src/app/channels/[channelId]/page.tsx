import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorList } from '@/components/errors/ErrorList'
import { PaginatedErrors } from '@/lib/types'
import { getStorageAdapter } from '@/lib/storage/factory'
import { filterErrors, paginateErrors } from '@/lib/analysis'

interface Props {
  params: Promise<{ channelId: string }>
  searchParams: Promise<Record<string, string>>
}

async function getChannelErrors(channelId: string, searchParams: Record<string, string>): Promise<PaginatedErrors | null> {
  try {
    const storage = getStorageAdapter()
    let errors = await storage.loadAllErrorEvents()
    errors = errors.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    const page = parseInt(searchParams.page ?? '1', 10)
    const pageSize = parseInt(searchParams.pageSize ?? '20', 10)
    const filtered = filterErrors(errors, { channel: channelId, search: searchParams.search })
    const { errors: paginated, total, totalPages } = paginateErrors(filtered, page, pageSize)

    return { errors: paginated, total, page, pageSize, totalPages }
  } catch {
    return null
  }
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { channelId } = await params
  const sp = await searchParams
  const data = await getChannelErrors(channelId, sp)

  return (
    <>
      <Header
        title={`채널: #${channelId}`}
        description="채널별 오류 현황"
      />
      <PageContainer>
        {data ? (
          <ErrorList
            errors={data.errors}
            total={data.total}
            page={data.page}
            totalPages={data.totalPages}
            pageSize={data.pageSize}
          />
        ) : (
          <p className="text-sm text-gray-400">데이터를 불러올 수 없습니다.</p>
        )}
      </PageContainer>
    </>
  )
}
