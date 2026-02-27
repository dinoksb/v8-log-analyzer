import {
  ErrorEvent,
  ChannelStats,
  DashboardStats,
  DailyCount,
  HourlyCount,
  ChannelActivityItem,
  TopErrorItem,
  ViewPeriod,
} from '@/lib/types'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const VALID_VIEW_PERIODS: ViewPeriod[] = ['1d', '3d', '7d', '30d', 'all']

export function parseViewPeriod(raw: string | undefined, fallback: ViewPeriod = '7d'): ViewPeriod {
  return (VALID_VIEW_PERIODS as string[]).includes(raw ?? '') ? (raw as ViewPeriod) : fallback
}

export function resolveViewPeriod(view: ViewPeriod): {
  fromUtc: string | undefined
  toUtc: string | undefined
  fromKst: string
  toKst: string
  label: string
} {
  if (view === 'all') {
    return {
      fromUtc: undefined,
      toUtc: undefined,
      fromKst: '',
      toKst: '',
      label: '기준: 전체',
    }
  }

  const nMap: Record<Exclude<ViewPeriod, 'all'>, number> = {
    '1d': 1,
    '3d': 3,
    '7d': 7,
    '30d': 30,
  }
  const n = nMap[view]

  const nowKstMs = Date.now() + KST_OFFSET_MS
  const kstMidnightMs = nowKstMs - (nowKstMs % (24 * 60 * 60 * 1000))

  // from: KST 당일 자정 기준 (N-1)일 전 자정 → UTC
  const fromUtcMs = kstMidnightMs - (n - 1) * 24 * 60 * 60 * 1000 - KST_OFFSET_MS
  // to: KST 당일 23:59:59.999 → UTC
  const toUtcMs = kstMidnightMs + 24 * 60 * 60 * 1000 - 1 - KST_OFFSET_MS

  const fromUtc = new Date(fromUtcMs).toISOString()
  const toUtc = new Date(toUtcMs).toISOString()

  // KST 날짜 문자열 생성
  const fromKstDate = new Date(fromUtcMs + KST_OFFSET_MS)
  const toKstDate = new Date(toUtcMs + KST_OFFSET_MS)

  function toDateString(d: Date): string {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fromKst = toDateString(fromKstDate)
  const toKst = toDateString(toKstDate)
  const label = `기준: ${fromKst} ~ ${toKst} (${n}일)`

  return { fromUtc, toUtc, fromKst, toKst, label }
}

function formatDateKey(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function computeChannelStats(
  channelId: string,
  channelName: string,
  errors: ErrorEvent[],
  days: number
): ChannelStats {
  const now = new Date()
  const from = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  const dailyMap = new Map<string, DailyCount>()
  const hourlyMap = new Map<number, HourlyCount>()
  let analysisCompleted = 0

  for (let d = 0; d < days; d++) {
    const date = new Date(from.getTime() + d * 24 * 60 * 60 * 1000)
    const key = formatDateKey(date)
    dailyMap.set(key, { date: key, count: 0 })
  }

  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { hour: h, count: 0 })
  }

  for (const error of errors) {
    const date = new Date(error.occurredAt)
    const dateKey = formatDateKey(date)
    const daily = dailyMap.get(dateKey)
    if (daily) {
      daily.count++
    }

    const hour = new Date(date.getTime() + KST_OFFSET_MS).getUTCHours()
    const hourly = hourlyMap.get(hour)
    if (hourly) {
      hourly.count++
    }

    if (error.analysis?.status === 'completed') {
      analysisCompleted++
    }
  }

  return {
    channel: channelId,
    channelName,
    period: {
      from: from.toISOString(),
      to: now.toISOString(),
      days,
    },
    totalErrors: errors.length,
    daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    byHour: Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour),
    analysisCompletedCount: analysisCompleted,
  }
}

export function computeDashboardStats(
  allErrors: ErrorEvent[],
  channelStats: ChannelStats[],
  view: ViewPeriod = '7d'
): DashboardStats {
  const today = formatDateKey(new Date())

  const totalErrors = allErrors.length
  const completedAnalyses = allErrors.filter((e) => e.analysis?.status === 'completed').length
  const analysisCompletedRate = totalErrors > 0
    ? Math.round((completedAnalyses / totalErrors) * 100)
    : 0
  const todayErrors = allErrors.filter((e) => formatDateKey(new Date(e.occurredAt)) === today).length

  const recentErrors = [...allErrors]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 10)

  const trendMap = new Map<string, number>()
  for (const e of allErrors) {
    const key = formatDateKey(new Date(e.occurredAt))
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1)
  }
  const errorTrend: DailyCount[] = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const channelActivity: ChannelActivityItem[] = channelStats.map((cs) => ({
    channelName: cs.channelName,
    channel: cs.channel,
    total: cs.totalErrors,
  }))

  const titleGroupMap = new Map<string, {
    count: number
    firstOccurredAt: string
    lastOccurredAt: string
    latestTs: string
    latestChannel: string
  }>()

  for (const error of allErrors) {
    const existing = titleGroupMap.get(error.title)
    if (!existing) {
      titleGroupMap.set(error.title, {
        count: 1,
        firstOccurredAt: error.occurredAt,
        lastOccurredAt: error.occurredAt,
        latestTs: error.ts,
        latestChannel: error.channel,
      })
    } else {
      existing.count++
      if (error.occurredAt < existing.firstOccurredAt) {
        existing.firstOccurredAt = error.occurredAt
      }
      if (error.occurredAt > existing.lastOccurredAt) {
        existing.lastOccurredAt = error.occurredAt
        existing.latestTs = error.ts
        existing.latestChannel = error.channel
      }
    }
  }

  const topErrors: TopErrorItem[] = Array.from(titleGroupMap.entries())
    .map(([title, data]) => ({ title, ...data }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.firstOccurredAt.localeCompare(b.firstOccurredAt)
    })

  const resolved = resolveViewPeriod(view)

  return {
    totalErrors,
    analysisCompletedRate,
    todayErrors,
    channels: channelStats,
    recentErrors,
    errorTrend,
    channelActivity,
    topErrors,
    period: {
      from: resolved.fromKst,
      to: resolved.toKst,
      label: resolved.label,
      view,
    },
  }
}

export function filterErrors(
  errors: ErrorEvent[],
  filter: {
    channel?: string
    search?: string
    hasAnalysis?: boolean
  }
): ErrorEvent[] {
  let result = [...errors]

  if (filter.channel) {
    result = result.filter((e) => e.channel === filter.channel || e.channelName === filter.channel)
  }

  if (filter.search) {
    const term = filter.search.toLowerCase()
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.rawText.toLowerCase().includes(term) ||
        e.channelName.toLowerCase().includes(term)
    )
  }

  if (filter.hasAnalysis !== undefined) {
    result = result.filter((e) =>
      filter.hasAnalysis ? !!e.analysis : !e.analysis
    )
  }

  return result
}

export function paginateErrors(
  errors: ErrorEvent[],
  page: number,
  pageSize: number
): { errors: ErrorEvent[]; total: number; totalPages: number } {
  const total = errors.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    errors: errors.slice(start, end),
    total,
    totalPages,
  }
}
