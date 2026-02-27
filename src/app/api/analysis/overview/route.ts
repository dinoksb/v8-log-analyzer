import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'
import { analyzeDashboard } from '@/lib/google'

export const dynamic = 'force-dynamic'

// DB에 저장된 분석 결과 로드 (AI 호출 없음)
export async function GET(): Promise<NextResponse> {
  try {
    const storage = getStorageAdapter()
    const analysis = await storage.loadDashboardAnalysis()

    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found' }, { status: 404 })
    }

    return NextResponse.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// 수동 재분석 트리거 → AI 호출 후 DB 저장
export async function POST(): Promise<NextResponse> {
  try {
    const storage = getStorageAdapter()
    const channels = await storage.listChannels()

    if (!channels.length) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }

    const channelStatsList = await Promise.all(
      channels.map(async (channelId) => {
        const cached = await storage.loadStats(channelId)
        if (cached) return cached

        const errors = await storage.loadErrorEvents(channelId)
        if (!errors.length) return null

        const channelName = errors[0]?.channelName ?? channelId
        return computeChannelStats(channelId, channelName, errors, 30)
      })
    )

    const validStats = channelStatsList.filter(Boolean) as Awaited<typeof channelStatsList>[number][]
    const allErrors = await storage.loadAllErrorEvents()

    if (!allErrors.length) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }

    const dashboard = computeDashboardStats(
      allErrors,
      validStats as Parameters<typeof computeDashboardStats>[1]
    )

    const analysis = await analyzeDashboard(dashboard)
    await storage.saveDashboardAnalysis(analysis)

    return NextResponse.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
