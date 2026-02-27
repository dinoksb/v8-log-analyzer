import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { collectChannelErrors } from '@/lib/slack'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats } from '@/lib/analysis'

export const maxDuration = 60 // Vercel Pro: 최대 300s, Hobby: 최대 60s

interface FetchBody {
  channelId: string
  channelName: string
  days?: number
  startDate?: string // 'YYYY-MM-DD'
  endDate?: string // 'YYYY-MM-DD'
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as FetchBody
    const { channelId, channelName, days = 7, startDate, endDate } = body

    if (!channelId || !channelName) {
      return NextResponse.json({ error: 'channelId and channelName are required' }, { status: 400 })
    }

    let dateRange: { oldest: string; latest?: string } | undefined
    let effectiveDays = days

    if (startDate) {
      const oldestMs = new Date(startDate).getTime()
      const latestMs = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : Date.now()

      if (isNaN(oldestMs)) {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
      }

      dateRange = {
        oldest: String(Math.floor(oldestMs / 1000)),
        latest: String(Math.floor(latestMs / 1000)),
      }
      effectiveDays = Math.max(1, Math.ceil((latestMs - oldestMs) / (24 * 60 * 60 * 1000)))
    }

    const { errors, fetchData } = await collectChannelErrors(
      channelId,
      channelName,
      effectiveDays,
      undefined,
      dateRange,
    )

    const storage = getStorageAdapter()
    await storage.saveRawData(channelId, fetchData)
    await storage.saveErrorEvents(channelId, errors)

    const stats = computeChannelStats(channelId, channelName, errors, effectiveDays)
    await storage.saveStats(channelId, stats)

    revalidatePath('/dashboard')
    revalidatePath('/errors')

    return NextResponse.json({ success: true, errorCount: errors.length, channelId, channelName })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Fetch] 실패:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
