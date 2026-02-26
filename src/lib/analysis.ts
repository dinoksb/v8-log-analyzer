import {
  ErrorEvent,
  ChannelStats,
  DashboardStats,
  DailyCount,
  HourlyCount,
  ChannelActivityItem,
  DailyCount as _DailyCount,
  TopErrorItem,
} from '@/lib/types'

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
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

    const hour = date.getHours()
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
  channelStats: ChannelStats[]
): DashboardStats {
  const today = formatDateKey(new Date())

  const totalErrors = allErrors.length
  const completedAnalyses = allErrors.filter((e) => e.analysis?.status === 'completed').length
  const analysisCompletedRate = totalErrors > 0
    ? Math.round((completedAnalyses / totalErrors) * 100)
    : 0
  const todayErrors = allErrors.filter((e) => e.occurredAt.startsWith(today)).length

  const recentErrors = [...allErrors]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 50)

  const trendMap = new Map<string, _DailyCount>()
  for (const cs of channelStats) {
    for (const d of cs.daily) {
      const existing = trendMap.get(d.date)
      if (existing) {
        existing.count += d.count
      } else {
        trendMap.set(d.date, { ...d })
      }
    }
  }

  const errorTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

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

  return {
    totalErrors,
    analysisCompletedRate,
    todayErrors,
    channels: channelStats,
    recentErrors,
    errorTrend,
    channelActivity,
    topErrors,
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
