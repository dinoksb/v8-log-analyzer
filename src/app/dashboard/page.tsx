import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorTrendChart } from '@/components/dashboard/ErrorTrendChart'
import { RecentErrors } from '@/components/dashboard/RecentErrors'
import { TopErrors } from '@/components/dashboard/TopErrors'
import { SyncButton } from '@/components/dashboard/SyncButton'
import { ErrorStats } from '@/components/dashboard/ErrorStats'
import { AISummaryPanel } from '@/components/dashboard/AISummaryPanel'
import { DashboardViewFilter } from '@/components/dashboard/DashboardViewFilter'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats, resolveViewPeriod, parseViewPeriod } from '@/lib/analysis'
import type { DashboardStats, ChannelStats, ViewPeriod } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<Record<string, string>>
}

async function getDashboardStats(view: ViewPeriod): Promise<DashboardStats | null> {
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
    const { fromUtc, toUtc } = resolveViewPeriod(view)
    const allErrors = await storage.loadAllErrorEvents({ from: fromUtc, to: toUtc })
    return computeDashboardStats(allErrors, validStats, view)
  } catch {
    return null
  }
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams
  const view = parseViewPeriod(sp.view)

  const stats = await getDashboardStats(view)
  const hasData = stats !== null && stats.totalErrors > 0

  return (
    <>
      <Header title="대시보드" description="Slack 채널 오류 현황 및 AI 분석 통계" />
      <PageContainer>
        <div className="space-y-6">
          <SyncButton />
          <Suspense fallback={<div className="h-8" />}>
            <DashboardViewFilter currentView={view} />
          </Suspense>
          {hasData && stats && (
            <>
              <ErrorStats
                totalErrors={stats.totalErrors}
                todayErrors={stats.todayErrors}
                periodLabel={stats.period.label}
              />
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
