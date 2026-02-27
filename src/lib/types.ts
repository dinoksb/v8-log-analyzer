export interface SlackMessage {
  ts: string
  userId: string
  userName: string
  text: string
  isBot: boolean
  reactions: SlackReaction[]
  replyCount: number
  threadTs?: string
  rawBlocks?: unknown[]
}

export interface Agent8ErrorDetail {
  /** 실제 발생 위치/기능 컨텍스트 (예: "Chat - functionName") */
  context?: string
  /** Error.name */
  name?: string
  /** Error.message */
  errorMessage?: string
  /** 스택 트레이스 */
  stack?: string
  /** 유저가 입력한 프롬프트 (최대 200자) */
  prompt?: string
  /** 오류가 발생한 프로세스명 */
  process?: string
  /** 소요 시간(ms) */
  elapsedTime?: number
  /** 앱 버전 */
  version?: string
  /** 오류 발생 시각 (HH:MM:SS.mmm) */
  time?: string
  /** 실제 유저 ID (봇 ID가 아닌) */
  userId?: string
  /** 오류 발생 페이지 URL */
  url?: string
  /** User-Agent (최대 100자) */
  userAgent?: string
  /** Sentry 이벤트 ID */
  sentryEventId?: string
}

export interface SlackReaction {
  name: string
  count: number
}

export interface SlackThread {
  parentMessage: SlackMessage
  replies: SlackMessage[]
}

export interface SlackChannel {
  id: string
  name: string
  isMember: boolean
  numMembers?: number
  topic?: string
  purpose?: string
}

export interface ErrorEvent {
  id: string
  channel: string
  channelName: string
  title: string
  rawText: string
  ts: string
  occurredAt: string
  userId: string
  userName: string
  isBot: boolean
  thread?: SlackThread
  analysis?: ErrorAnalysis
  tags: string[]
  errorDetail?: Agent8ErrorDetail
}

export interface ErrorAnalysis {
  id: string
  errorEventId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  summary: string
  rootCauses: RootCause[]
  solutions: Solution[]
  analyzedAt?: string
  claudeModel: string
  errorMessage?: string
}

export interface RootCause {
  description: string
  confidence: number
  category: string
}

export interface Solution {
  title: string
  description: string
  steps: string[]
  priority: 'immediate' | 'short_term' | 'long_term'
  estimatedEffort: 'low' | 'medium' | 'high'
}

export interface DailyCount {
  date: string
  count: number
}

export interface HourlyCount {
  hour: number
  count: number
}

export interface ChannelStats {
  channel: string
  channelName: string
  period: {
    from: string
    to: string
    days: number
  }
  totalErrors: number
  daily: DailyCount[]
  byHour: HourlyCount[]
  analysisCompletedCount: number
}

export interface TopErrorItem {
  title: string
  count: number
  firstOccurredAt: string
  lastOccurredAt: string
  latestTs: string
  latestChannel: string
}

export type ViewPeriod = '1d' | '3d' | '7d' | '30d' | 'all'

export interface DashboardStats {
  totalErrors: number
  analysisCompletedRate: number
  todayErrors: number
  channels: ChannelStats[]
  recentErrors: ErrorEvent[]
  errorTrend: DailyCount[]
  channelActivity: ChannelActivityItem[]
  topErrors: TopErrorItem[]
  period: {
    from: string
    to: string
    label: string
    view: ViewPeriod
  }
}

export interface ChannelActivityItem {
  channelName: string
  channel: string
  total: number
}

export interface PaginatedErrors {
  errors: ErrorEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ErrorFilter {
  channel?: string
  search?: string
  page?: number
  pageSize?: number
  hasAnalysis?: boolean
}

export interface DashboardAnalysis {
  headline: string
  overview: string
  insights: string[]
  analyzedAt: string
}

export interface SlackFetchData {
  channelId: string
  channelName: string
  fetchedAt: string
  days: number
  messages: SlackMessage[]
  threads: Record<string, SlackThread>
  errors: ErrorEvent[]
}
