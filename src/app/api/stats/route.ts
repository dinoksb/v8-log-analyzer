import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
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
      })
    )

    const validStats = channelStatsList.filter(Boolean) as Awaited<typeof channelStatsList>[number][]

    const allErrors = await storage.loadAllErrorEvents()

    const dashboard = computeDashboardStats(
      allErrors,
      validStats as Parameters<typeof computeDashboardStats>[1]
    )

    return NextResponse.json(dashboard)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
