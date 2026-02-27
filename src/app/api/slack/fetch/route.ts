import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { collectChannelErrors } from '@/lib/slack'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'
import { analyzeDashboard } from '@/lib/google'

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
      // 날짜 문자열을 KST(UTC+9) 기준으로 파싱. new Date("YYYY-MM-DD")는 UTC 자정으로
      // 해석되어 한국시간 00:00~09:00 구간 메시지가 누락되는 문제를 방지한다.
      const oldestMs = new Date(`${startDate}T00:00:00+09:00`).getTime()
      const latestMs = endDate ? new Date(`${endDate}T23:59:59.999+09:00`).getTime() : Date.now()

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

    // 수집 완료 후 AI 분석 1회 실행 → DB 저장
    try {
      const allChannels = await storage.listChannels()
      const allStatsList = await Promise.all(allChannels.map((ch) => storage.loadStats(ch)))
      const validStats = allStatsList.filter(Boolean) as NonNullable<typeof allStatsList[number]>[]
      const allErrors = await storage.loadAllErrorEvents()

      if (allErrors.length > 0) {
        const dashboard = computeDashboardStats(allErrors, validStats)
        const analysis = await analyzeDashboard(dashboard)
        await storage.saveDashboardAnalysis(analysis)
      }
    } catch (analysisErr) {
      console.error('[Fetch] AI 분석 실패:', analysisErr instanceof Error ? analysisErr.message : String(analysisErr))
    }

    revalidatePath('/dashboard')
    revalidatePath('/errors')

    const debugOldest = dateRange?.oldest ?? 'computed-in-slack-lib'
    return NextResponse.json({ success: true, errorCount: errors.length, channelId, channelName, _debug: { oldest: debugOldest, startDate, endDate, days } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Fetch] 실패:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
