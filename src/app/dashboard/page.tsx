import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorTrendChart } from '@/components/dashboard/ErrorTrendChart'
import { RecentErrors } from '@/components/dashboard/RecentErrors'
import { TopErrors } from '@/components/dashboard/TopErrors'
import { DateRangeFetcher } from '@/components/dashboard/DateRangeFetcher'
import { ErrorStats } from '@/components/dashboard/ErrorStats'
import { AISummaryPanel } from '@/components/dashboard/AISummaryPanel'
import type { DashboardStats } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/stats`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as Promise<DashboardStats>
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const hasData = stats !== null && stats.totalErrors > 0

  return (
    <>
      <Header
        title="대시보드"
        description="Slack 채널 오류 현황 및 AI 분석 통계"
      />
      <PageContainer>
        <div className="space-y-6">
          <DateRangeFetcher />
          {hasData && stats && (
            <>
              <ErrorStats
                totalErrors={stats.totalErrors}
                todayErrors={stats.todayErrors}
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
