import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ChannelFetcher } from '@/components/channels/ChannelFetcher'
import { SlackChannel } from '@/lib/types'

async function getChannels(): Promise<SlackChannel[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/slack/channels`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { channels: SlackChannel[] }
    return data.channels
  } catch {
    return []
  }
}

export default async function ChannelsPage() {
  const channels = await getChannels()

  return (
    <>
      <Header
        title="채널 관리"
        description="Slack 채널 목록과 오류 수집 설정"
      />
      <PageContainer>
        <ChannelFetcher initialChannels={channels} />
      </PageContainer>
    </>
  )
}
