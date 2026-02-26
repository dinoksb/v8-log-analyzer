import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { collectChannelErrors } from '@/lib/slack'
import { getStorageAdapter } from '@/lib/storage/factory'
import { computeChannelStats } from '@/lib/analysis'
import { createJob, updateJobProgress, completeJob, failJob, getActiveJobForChannel } from '@/lib/jobStore'
import { generateId } from '@/lib/utils'

interface FetchBody {
  channelId: string
  channelName: string
  days?: number
  startDate?: string  // 'YYYY-MM-DD'
  endDate?: string    // 'YYYY-MM-DD'
}

async function runFetchJob(
  jobId: string,
  channelId: string,
  channelName: string,
  effectiveDays: number,
  dateRange?: { oldest: string; latest?: string }
): Promise<void> {
  try {
    const { errors, fetchData } = await collectChannelErrors(
      channelId,
      channelName,
      effectiveDays,
      undefined,
      dateRange,
      (progress) => updateJobProgress(jobId, progress)
    )

    const storage = getStorageAdapter()
    const rawPath = await storage.saveRawData(channelId, fetchData)
    await storage.saveErrorEvents(channelId, errors)

    const stats = computeChannelStats(channelId, channelName, errors, effectiveDays)
    await storage.saveStats(channelId, stats)

    revalidatePath('/dashboard')
    revalidatePath('/errors')
    completeJob(jobId, { errorCount: errors.length, rawPath })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Fetch] Job ${jobId} 실패:`, message)
    failJob(jobId, message)
  }
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
      const latestMs = endDate
        ? new Date(`${endDate}T23:59:59.999Z`).getTime()
        : Date.now()

      if (isNaN(oldestMs)) {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
      }

      dateRange = {
        oldest: String(Math.floor(oldestMs / 1000)),
        latest: String(Math.floor(latestMs / 1000)),
      }
      effectiveDays = Math.max(1, Math.ceil((latestMs - oldestMs) / (24 * 60 * 60 * 1000)))
    }

    // 이미 실행 중인 Job이 있으면 중복 실행 차단
    const existing = getActiveJobForChannel(channelId)
    if (existing) {
      console.log(`[Fetch] 중복 요청 차단: #${channelName} 이미 수집 중 (jobId=${existing.id})`)
      return NextResponse.json({ jobId: existing.id, channelId, channelName, status: 'already_running' })
    }

    const jobId = generateId('job')
    createJob(jobId, channelId, channelName)

    console.log(`[Fetch] Job 시작: ${jobId} (#${channelName}, ${effectiveDays}일)`)

    // 백그라운드에서 실행 — await하지 않음
    void runFetchJob(jobId, channelId, channelName, effectiveDays, dateRange)

    return NextResponse.json({ jobId, channelId, channelName, status: 'started' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
