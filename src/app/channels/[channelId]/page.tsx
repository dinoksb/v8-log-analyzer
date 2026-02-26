import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorList } from '@/components/errors/ErrorList'
import { PaginatedErrors } from '@/lib/types'

interface Props {
  params: Promise<{ channelId: string }>
  searchParams: Promise<Record<string, string>>
}

async function getChannelErrors(channelId: string, searchParams: Record<string, string>): Promise<PaginatedErrors | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const params = new URLSearchParams({ channel: channelId, ...searchParams })
    const res = await fetch(`${baseUrl}/api/errors?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json() as Promise<PaginatedErrors>
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
