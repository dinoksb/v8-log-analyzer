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

// Module-level Map: 같은 프로세스 내 요청 간 상태 유지
const jobs = new Map<string, Job>()

// 채널별 활성 Job ID 추적 (중복 실행 방지)
const activeJobByChannel = new Map<string, string>()

/** 채널에 이미 실행 중인 Job이 있으면 해당 Job을 반환, 없으면 undefined */
export function getActiveJobForChannel(channelId: string): Job | undefined {
  const jobId = activeJobByChannel.get(channelId)
  if (!jobId) return undefined
  const job = jobs.get(jobId)
  // 완료/오류 상태는 "활성" 아님
  if (!job || job.status === 'done' || job.status === 'error') {
    activeJobByChannel.delete(channelId)
    return undefined
  }
  return job
}

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
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function updateJobProgress(id: string, progress: JobProgress): void {
  const job = jobs.get(id)
  if (!job) return
  job.status = 'running'
  job.progress = progress
}

export function completeJob(id: string, result: { errorCount: number; rawPath?: string }): void {
  const job = jobs.get(id)
  if (!job) return
  job.status = 'done'
  job.result = result
  job.finishedAt = new Date().toISOString()
  job.progress = {
    step: 'done',
    current: result.errorCount,
    total: result.errorCount,
    message: `완료: ${result.errorCount}개 오류 수집됨`,
  }
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id)
  if (!job) return
  job.status = 'error'
  job.error = error
  job.finishedAt = new Date().toISOString()
  job.progress = {
    step: 'error',
    current: 0,
    total: 0,
    message: `오류: ${error}`,
  }
}

function pruneJobs(): void {
  if (jobs.size <= 100) return
  const sorted = [...jobs.entries()].sort((a, b) => a[1].startedAt.localeCompare(b[1].startedAt))
  for (const [key] of sorted.slice(0, jobs.size - 100)) {
    jobs.delete(key)
  }
}
