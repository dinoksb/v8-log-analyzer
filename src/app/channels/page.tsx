import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ChannelFetcher } from '@/components/channels/ChannelFetcher'
import { SlackChannel } from '@/lib/types'
import { getTargetChannel } from '@/lib/slack'

async function getChannels(): Promise<SlackChannel[]> {
  try {
    const channel = await getTargetChannel()
    return [channel]
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
