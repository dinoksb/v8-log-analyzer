import { ErrorEvent, ErrorAnalysis, ChannelStats, SlackFetchData } from '@/lib/types'

export interface StorageAdapter {
  saveRawData(channel: string, data: SlackFetchData): Promise<string>
  loadErrorEvents(channel: string): Promise<ErrorEvent[]>
  saveErrorEvents(channel: string, errors: ErrorEvent[]): Promise<void>
  updateErrorEvent(id: string, patch: Partial<ErrorEvent>): Promise<void>
  saveAnalysis(analysis: ErrorAnalysis): Promise<void>
  loadAnalysis(errorEventId: string): Promise<ErrorAnalysis | null>
  saveStats(channel: string, stats: ChannelStats): Promise<void>
  loadStats(channel: string): Promise<ChannelStats | null>
  listChannels(): Promise<string[]>
  loadAllErrorEvents(): Promise<ErrorEvent[]>
}
