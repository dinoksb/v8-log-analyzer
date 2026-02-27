import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { collectChannelErrors } from '@/lib/slack'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats, computeDashboardStats } from '@/lib/analysis'
import { analyzeDashboard } from '@/lib/google'
import { ErrorEvent } from '@/lib/types'

export const maxDuration = 60

interface SyncBody {
  channelId?: string
  channelName?: string
}

interface SyncResponse {
  success: boolean
  newErrorCount: number
  isFirstSync: boolean
  syncedFrom: string
  fetchedAt: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: SyncBody
  try {
    body = (await request.json()) as SyncBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { channelId, channelName } = body

    if (!channelId || !channelName) {
      return NextResponse.json(
        { error: 'channelId and channelName are required' },
        { status: 400 },
      )
    }

    const storage = getStorageAdapter()
    const lastTs = await storage.getLastMessageTs(channelId)
    const isFirstSync = lastTs === null

    let oldest: string
    let effectiveDays: number

    if (lastTs !== null) {
      // 마지막 메시지 이후부터 수집
      oldest = lastTs
      effectiveDays = Math.max(1, Math.ceil((Date.now() / 1000 - Number(lastTs)) / 86400))
    } else {
      // 최초 동기화: 오늘 KST 자정 기준
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
      const kstDate = kstNow.toISOString().slice(0, 10)
      const oldestMs = new Date(`${kstDate}T00:00:00+09:00`).getTime()
      oldest = String(Math.floor(oldestMs / 1000))
      effectiveDays = 1
    }

    const syncedFrom = new Date(Number(oldest) * 1000).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    })
    console.log(
      `[Sync] #${channelName} 동기화 시작 — isFirstSync=${isFirstSync}, oldest=${oldest} (${syncedFrom}), effectiveDays=${effectiveDays}`,
    )

    const { errors: newErrors, fetchData } = await collectChannelErrors(
      channelId,
      channelName,
      effectiveDays,
      undefined,
      { oldest },
    )

    await storage.saveRawData(channelId, fetchData)

    // LocalFile은 전체 교체 방식이므로 기존 데이터와 merge (중복 제거 후 저장)
    // Supabase는 saveErrorEvents가 ignoreDuplicates:true라 자동 처리되지만
    // 통일적 처리를 위해 route에서 merge 수행
    const existingErrors = await storage.loadErrorEvents(channelId)
    const mergedMap = new Map<string, ErrorEvent>()

    // 기존 데이터를 먼저 등록 (기존 우선)
    for (const e of existingErrors) {
      mergedMap.set(e.ts, e)
    }
    // 신규 데이터는 기존에 없는 것만 추가
    for (const e of newErrors) {
      if (!mergedMap.has(e.ts)) {
        mergedMap.set(e.ts, e)
      }
    }

    const mergedErrors = Array.from(mergedMap.values()).sort((a, b) =>
      b.ts.localeCompare(a.ts),
    )
    await storage.saveErrorEvents(channelId, mergedErrors)

    const stats = computeChannelStats(channelId, channelName, mergedErrors, effectiveDays)
    await storage.saveStats(channelId, stats)

    // 수집 완료 후 AI 분석 1회 실행 → DB 저장
    try {
      const allChannels = await storage.listChannels()
      const allStatsList = await Promise.all(allChannels.map((ch) => storage.loadStats(ch)))
      const validStats = allStatsList.filter(Boolean) as NonNullable<
        (typeof allStatsList)[number]
      >[]
      const allErrors = await storage.loadAllErrorEvents()

      if (allErrors.length > 0) {
        const dashboard = computeDashboardStats(allErrors, validStats)
        const analysis = await analyzeDashboard(dashboard)
        await storage.saveDashboardAnalysis(analysis)
      }
    } catch (analysisErr) {
      console.error(
        '[Sync] AI 분석 실패:',
        analysisErr instanceof Error ? analysisErr.message : String(analysisErr),
      )
    }

    revalidatePath('/dashboard')
    revalidatePath('/errors')

    const existingTsSet = new Set(existingErrors.map((e) => e.ts))
    const newErrorCount = newErrors.filter((e) => !existingTsSet.has(e.ts)).length
    const fetchedAt = new Date().toISOString()

    console.log(`[Sync] #${channelName} 완료 — 신규 ${newErrorCount}개 추가`)

    const response: SyncResponse = {
      success: true,
      newErrorCount,
      isFirstSync,
      syncedFrom,
      fetchedAt,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Sync] 실패:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
