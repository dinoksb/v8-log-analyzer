import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorTrendChart } from '@/components/dashboard/ErrorTrendChart'
import { RecentErrors } from '@/components/dashboard/RecentErrors'
import { TopErrors } from '@/components/dashboard/TopErrors'
import { DateRangeFetcher } from '@/components/dashboard/DateRangeFetcher'
import { ErrorStats } from '@/components/dashboard/ErrorStats'
import { AISummaryPanel } from '@/components/dashboard/AISummaryPanel'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'
import type { DashboardStats, ChannelStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const storage = getStorageAdapter()
    const channels = await storage.listChannels()

    const channelStatsList = await Promise.all(
      channels.map(async (channelId) => {
        const cached = await storage.loadStats(channelId)
        if (cached) return cached

        const errors = await storage.loadErrorEvents(channelId)
        if (!errors.length) return null

        const channelName = errors[0]?.channelName ?? channelId
        const stats = computeChannelStats(channelId, channelName, errors, 30)
        await storage.saveStats(channelId, stats)
        return stats
      }),
    )

    const validStats = channelStatsList.filter(Boolean) as ChannelStats[]
    const allErrors = await storage.loadAllErrorEvents()
    return computeDashboardStats(allErrors, validStats)
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const hasData = stats !== null && stats.totalErrors > 0

  return (
    <>
      <Header title="대시보드" description="Slack 채널 오류 현황 및 AI 분석 통계" />
      <PageContainer>
        <div className="space-y-6">
          <DateRangeFetcher />
          {hasData && stats && (
            <>
              <ErrorStats totalErrors={stats.totalErrors} todayErrors={stats.todayErrors} />
              <AISummaryPanel />
              <ErrorTrendChart data={stats.errorTrend} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TopErrors items={stats.topErrors} />
                <RecentErrors errors={stats.recentErrors} />
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </>
  )
}
