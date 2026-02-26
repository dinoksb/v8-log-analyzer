import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'
import { analyzeDashboard } from '@/lib/claude'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
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

    return NextResponse.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
