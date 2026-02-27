import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ErrorEvent, ErrorAnalysis, ChannelStats, SlackFetchData, DashboardAnalysis } from '@/lib/types'
import { StorageAdapter } from './adapter'

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  return createClient(url, key)
}

function errorToRow(e: ErrorEvent): Record<string, unknown> {
  return {
    id: e.id,
    channel: e.channel,
    channel_name: e.channelName,
    title: e.title,
    raw_text: e.rawText,
    ts: e.ts,
    occurred_at: e.occurredAt,
    user_id: e.userId,
    user_name: e.userName,
    is_bot: e.isBot,
    thread: e.thread ?? null,
    analysis: e.analysis ?? null,
    tags: e.tags,
    error_detail: e.errorDetail ?? null,
  }
}

function rowToErrorEvent(row: Record<string, unknown>): ErrorEvent {
  return {
    id: row.id as string,
    channel: row.channel as string,
    channelName: row.channel_name as string,
    title: row.title as string,
    rawText: row.raw_text as string,
    ts: row.ts as string,
    occurredAt: row.occurred_at as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    isBot: row.is_bot as boolean,
    thread: row.thread as ErrorEvent['thread'],
    analysis: row.analysis as ErrorAnalysis | undefined,
    tags: (row.tags as string[]) ?? [],
    errorDetail: row.error_detail as ErrorEvent['errorDetail'],
  }
}

function rowToAnalysis(row: Record<string, unknown>): ErrorAnalysis {
  return {
    id: row.id as string,
    errorEventId: row.error_event_id as string,
    status: row.status as ErrorAnalysis['status'],
    summary: row.summary as string,
    rootCauses: (row.root_causes as ErrorAnalysis['rootCauses']) ?? [],
    solutions: (row.solutions as ErrorAnalysis['solutions']) ?? [],
    analyzedAt: (row.analyzed_at as string | null) ?? undefined,
    claudeModel: row.claude_model as string,
    errorMessage: (row.error_message as string | null) ?? undefined,
  }
}

export class SupabaseStorage implements StorageAdapter {
  private client: SupabaseClient

  constructor() {
    this.client = createSupabaseClient()
  }

  async saveRawData(channel: string, data: SlackFetchData): Promise<string> {
    const { error } = await this.client.from('raw_fetches').upsert(
      {
        id: channel,
        channel,
        channel_name: data.channelName,
        fetched_at: data.fetchedAt,
        days: data.days,
        data,
      },
      { onConflict: 'id' },
    )

    if (error) throw new Error(`Failed to save raw data: ${error.message}`)
    return channel
  }

  async loadErrorEvents(channel: string): Promise<ErrorEvent[]> {
    const { data, error } = await this.client
      .from('error_events')
      .select('*')
      .eq('channel', channel)
      .order('occurred_at', { ascending: false })

    if (error) throw new Error(`Failed to load error events: ${error.message}`)
    return (data ?? []).map(rowToErrorEvent)
  }

  async saveErrorEvents(channel: string, errors: ErrorEvent[]): Promise<void> {
    if (errors.length === 0) return

    const rows = errors.map(errorToRow)
    const { error } = await this.client
      .from('error_events')
      .upsert(rows, { onConflict: 'channel,ts', ignoreDuplicates: true })

    if (error) throw new Error(`Failed to save error events: ${error.message}`)
  }

  async updateErrorEvent(id: string, patch: Partial<ErrorEvent>): Promise<void> {
    const updates: Record<string, unknown> = {}
    if (patch.channel !== undefined) updates.channel = patch.channel
    if (patch.channelName !== undefined) updates.channel_name = patch.channelName
    if (patch.title !== undefined) updates.title = patch.title
    if (patch.rawText !== undefined) updates.raw_text = patch.rawText
    if (patch.ts !== undefined) updates.ts = patch.ts
    if (patch.occurredAt !== undefined) updates.occurred_at = patch.occurredAt
    if (patch.userId !== undefined) updates.user_id = patch.userId
    if (patch.userName !== undefined) updates.user_name = patch.userName
    if (patch.isBot !== undefined) updates.is_bot = patch.isBot
    if (patch.thread !== undefined) updates.thread = patch.thread
    if (patch.analysis !== undefined) updates.analysis = patch.analysis
    if (patch.tags !== undefined) updates.tags = patch.tags
    if (patch.errorDetail !== undefined) updates.error_detail = patch.errorDetail

    if (Object.keys(updates).length === 0) return

    const { error } = await this.client.from('error_events').update(updates).eq('id', id)

    if (error) throw new Error(`Failed to update error event: ${error.message}`)
  }

  async saveAnalysis(analysis: ErrorAnalysis): Promise<void> {
    const { error: analysisError } = await this.client.from('error_analyses').upsert(
      {
        id: analysis.id,
        error_event_id: analysis.errorEventId,
        status: analysis.status,
        summary: analysis.summary,
        root_causes: analysis.rootCauses,
        solutions: analysis.solutions,
        analyzed_at: analysis.analyzedAt ?? null,
        claude_model: analysis.claudeModel,
        error_message: analysis.errorMessage ?? null,
      },
      { onConflict: 'id' },
    )

    if (analysisError) throw new Error(`Failed to save analysis: ${analysisError.message}`)

    // Also embed analysis into the error event for fast reads
    const { error: eventError } = await this.client
      .from('error_events')
      .update({ analysis })
      .eq('id', analysis.errorEventId)

    if (eventError) throw new Error(`Failed to update error event analysis: ${eventError.message}`)
  }

  async loadAnalysis(errorEventId: string): Promise<ErrorAnalysis | null> {
    const { data, error } = await this.client
      .from('error_analyses')
      .select('*')
      .eq('error_event_id', errorEventId)
      .maybeSingle()

    if (error) return null
    if (!data) return null
    return rowToAnalysis(data as Record<string, unknown>)
  }

  async saveStats(channel: string, stats: ChannelStats): Promise<void> {
    const { error } = await this.client.from('channel_stats').upsert(
      {
        channel: stats.channel,
        channel_name: stats.channelName,
        period_from: stats.period.from,
        period_to: stats.period.to,
        period_days: stats.period.days,
        total_errors: stats.totalErrors,
        daily: stats.daily,
        by_hour: stats.byHour,
        analysis_completed_count: stats.analysisCompletedCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel' },
    )

    if (error) throw new Error(`Failed to save stats: ${error.message}`)
  }

  async loadStats(channel: string): Promise<ChannelStats | null> {
    const { data, error } = await this.client
      .from('channel_stats')
      .select('*')
      .eq('channel', channel)
      .maybeSingle()

    if (error) return null
    if (!data) return null

    const row = data as Record<string, unknown>
    return {
      channel: row.channel as string,
      channelName: row.channel_name as string,
      period: {
        from: row.period_from as string,
        to: row.period_to as string,
        days: row.period_days as number,
      },
      totalErrors: row.total_errors as number,
      daily: row.daily as ChannelStats['daily'],
      byHour: row.by_hour as ChannelStats['byHour'],
      analysisCompletedCount: row.analysis_completed_count as number,
    }
  }

  async listChannels(): Promise<string[]> {
    const { data, error } = await this.client.from('error_events').select('channel')

    if (error) return []
    const channels = [...new Set((data ?? []).map((r: { channel: string }) => r.channel))]
    return channels
  }

  async loadAllErrorEvents(): Promise<ErrorEvent[]> {
    const { data, error } = await this.client
      .from('error_events')
      .select('*')
      .order('occurred_at', { ascending: false })

    if (error) throw new Error(`Failed to load all error events: ${error.message}`)
    return (data ?? []).map(rowToErrorEvent)
  }

  async saveDashboardAnalysis(analysis: DashboardAnalysis): Promise<void> {
    const { error } = await this.client.from('dashboard_analyses').upsert(
      {
        id: 'latest',
        headline: analysis.headline,
        overview: analysis.overview,
        insights: analysis.insights,
        analyzed_at: analysis.analyzedAt,
      },
      { onConflict: 'id' },
    )

    if (error) throw new Error(`Failed to save dashboard analysis: ${error.message}`)
  }

  async loadDashboardAnalysis(): Promise<DashboardAnalysis | null> {
    const { data, error } = await this.client
      .from('dashboard_analyses')
      .select('*')
      .eq('id', 'latest')
      .maybeSingle()

    if (error) return null
    if (!data) return null

    const row = data as Record<string, unknown>
    return {
      headline: row.headline as string,
      overview: row.overview as string,
      insights: (row.insights as string[]) ?? [],
      analyzedAt: row.analyzed_at as string,
    }
  }
}
