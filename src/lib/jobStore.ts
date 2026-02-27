import { createClient } from '@supabase/supabase-js'

export type JobStatus = 'pending' | 'running' | 'done' | 'error'

export interface JobProgress {
  step: string
  current: number
  total: number
  message: string
}

export interface Job {
  id: string
  channelId: string
  channelName: string
  status: JobStatus
  progress: JobProgress
  result?: { errorCount: number; rawPath?: string }
  error?: string
  startedAt: string
  finishedAt?: string
}

// In-memory fallback: same-instance 내 빠른 접근용
const jobs = new Map<string, Job>()
const activeJobByChannel = new Map<string, string>()

function getClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    channelId: row.channel_id as string,
    channelName: row.channel_name as string,
    status: row.status as JobStatus,
    progress: (row.progress as JobProgress) ?? {
      step: 'init',
      current: 0,
      total: 0,
      message: '수집 준비 중...',
    },
    result: row.result as Job['result'] | undefined,
    error: (row.error as string | null) ?? undefined,
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string | null) ?? undefined,
  }
}

/** 채널에 실행 중인 job 반환 (Supabase → 인메모리 순으로 조회) */
export async function getActiveJobForChannel(channelId: string): Promise<Job | undefined> {
  const client = getClient()
  if (client) {
    const { data } = await client
      .from('fetch_jobs')
      .select('*')
      .eq('channel_id', channelId)
      .in('status', ['pending', 'running'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return rowToJob(data as Record<string, unknown>)
  }

  // Supabase 미설정 시 인메모리 폴백
  const jobId = activeJobByChannel.get(channelId)
  if (!jobId) return undefined
  const job = jobs.get(jobId)
  if (!job || job.status === 'done' || job.status === 'error') {
    activeJobByChannel.delete(channelId)
    return undefined
  }
  return job
}

/** Job 생성 — Supabase에 insert (fire-and-forget) + 인메모리 저장 */
export function createJob(id: string, channelId: string, channelName: string): Job {
  const job: Job = {
    id,
    channelId,
    channelName,
    status: 'pending',
    progress: { step: 'init', current: 0, total: 0, message: '수집 준비 중...' },
    startedAt: new Date().toISOString(),
  }
  jobs.set(id, job)
  activeJobByChannel.set(channelId, id)
  pruneJobs()

  const client = getClient()
  if (client) {
    void client
      .from('fetch_jobs')
      .insert({
        id,
        channel_id: channelId,
        channel_name: channelName,
        status: 'pending',
        progress: job.progress,
        started_at: job.startedAt,
      })
  }

  return job
}

/** Job 조회 (Supabase → 인메모리 순) */
export async function getJob(id: string): Promise<Job | undefined> {
  const client = getClient()
  if (client) {
    const { data } = await client
      .from('fetch_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (data) return rowToJob(data as Record<string, unknown>)
  }

  return jobs.get(id)
}

/** 진행상태 업데이트 — 인메모리 즉시 반영 + Supabase fire-and-forget */
export function updateJobProgress(id: string, progress: JobProgress): void {
  const job = jobs.get(id)
  if (job) {
    job.status = 'running'
    job.progress = progress
  }

  const client = getClient()
  if (client) {
    void client
      .from('fetch_jobs')
      .update({ status: 'running', progress })
      .eq('id', id)
  }
}

/** Job 완료 */
export async function completeJob(
  id: string,
  result: { errorCount: number; rawPath?: string },
): Promise<void> {
  const finishedAt = new Date().toISOString()
  const progress: JobProgress = {
    step: 'done',
    current: result.errorCount,
    total: result.errorCount,
    message: `완료: ${result.errorCount}개 오류 수집됨`,
  }

  const job = jobs.get(id)
  if (job) {
    job.status = 'done'
    job.result = result
    job.finishedAt = finishedAt
    job.progress = progress
  }

  const client = getClient()
  if (client) {
    await client
      .from('fetch_jobs')
      .update({ status: 'done', result, finished_at: finishedAt, progress })
      .eq('id', id)
  }
}

/** Job 실패 */
export async function failJob(id: string, error: string): Promise<void> {
  const finishedAt = new Date().toISOString()
  const progress: JobProgress = {
    step: 'error',
    current: 0,
    total: 0,
    message: `오류: ${error}`,
  }

  const job = jobs.get(id)
  if (job) {
    job.status = 'error'
    job.error = error
    job.finishedAt = finishedAt
    job.progress = progress
  }

  const client = getClient()
  if (client) {
    await client
      .from('fetch_jobs')
      .update({ status: 'error', error, finished_at: finishedAt, progress })
      .eq('id', id)
  }
}

function pruneJobs(): void {
  if (jobs.size <= 100) return
  const sorted = [...jobs.entries()].sort((a, b) => a[1].startedAt.localeCompare(b[1].startedAt))
  for (const [key] of sorted.slice(0, jobs.size - 100)) {
    jobs.delete(key)
  }
}
