import fs from 'fs/promises'
import path from 'path'
import { ErrorEvent, ErrorAnalysis, ChannelStats, SlackFetchData, DashboardAnalysis } from '@/lib/types'
import { StorageAdapter, LoadErrorOptions } from './adapter'

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export class LocalFileStorage implements StorageAdapter {
  private channelDir(channel: string): string {
    return path.join(DATA_DIR, channel)
  }

  async saveRawData(channel: string, data: SlackFetchData): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = path.join(this.channelDir(channel), `raw_${timestamp}.json`)
    await writeJson(filePath, data)
    return filePath
  }

  async loadErrorEvents(channel: string): Promise<ErrorEvent[]> {
    const filePath = path.join(this.channelDir(channel), 'errors.json')
    const data = await readJson<ErrorEvent[]>(filePath)
    return data ?? []
  }

  async saveErrorEvents(channel: string, errors: ErrorEvent[]): Promise<void> {
    const filePath = path.join(this.channelDir(channel), 'errors.json')
    await writeJson(filePath, errors)
  }

  async updateErrorEvent(id: string, patch: Partial<ErrorEvent>): Promise<void> {
    const channels = await this.listChannels()
    for (const channel of channels) {
      const errors = await this.loadErrorEvents(channel)
      const idx = errors.findIndex((e) => e.id === id)
      if (idx !== -1) {
        errors[idx] = { ...errors[idx], ...patch }
        await this.saveErrorEvents(channel, errors)
        return
      }
    }
  }

  async saveAnalysis(analysis: ErrorAnalysis): Promise<void> {
    const filePath = path.join(DATA_DIR, 'analyses', `${analysis.errorEventId}.json`)
    await writeJson(filePath, analysis)
  }

  async loadAnalysis(errorEventId: string): Promise<ErrorAnalysis | null> {
    const filePath = path.join(DATA_DIR, 'analyses', `${errorEventId}.json`)
    return readJson<ErrorAnalysis>(filePath)
  }

  async saveStats(channel: string, stats: ChannelStats): Promise<void> {
    const filePath = path.join(this.channelDir(channel), 'stats.json')
    await writeJson(filePath, stats)
  }

  async loadStats(channel: string): Promise<ChannelStats | null> {
    const filePath = path.join(this.channelDir(channel), 'stats.json')
    return readJson<ChannelStats>(filePath)
  }

  async listChannels(): Promise<string[]> {
    try {
      await ensureDir(DATA_DIR)
      const entries = await fs.readdir(DATA_DIR, { withFileTypes: true })
      return entries
        .filter((e) => e.isDirectory() && e.name !== 'analyses')
        .map((e) => e.name)
    } catch {
      return []
    }
  }

  async loadAllErrorEvents(options?: LoadErrorOptions): Promise<ErrorEvent[]> {
    const channels = await this.listChannels()
    const all: ErrorEvent[] = []
    for (const channel of channels) {
      const errors = await this.loadErrorEvents(channel)
      all.push(...errors)
    }
    return all.filter((e) => {
      const ms = new Date(e.occurredAt).getTime()
      if (options?.from && ms < new Date(options.from).getTime()) return false
      if (options?.to && ms > new Date(options.to).getTime()) return false
      return true
    })
  }

  async saveDashboardAnalysis(analysis: DashboardAnalysis): Promise<void> {
    const filePath = path.join(DATA_DIR, 'dashboard_analysis.json')
    await writeJson(filePath, analysis)
  }

  async loadDashboardAnalysis(): Promise<DashboardAnalysis | null> {
    const filePath = path.join(DATA_DIR, 'dashboard_analysis.json')
    return readJson<DashboardAnalysis>(filePath)
  }

  async getLastMessageTs(channel: string): Promise<string | null> {
    const errors = await this.loadErrorEvents(channel)
    if (errors.length === 0) return null
    // Slack ts는 "1234567890.123456" 형식으로 lexicographic 비교 가능
    return errors.reduce<string | null>((max, e) => {
      if (max === null) return e.ts
      return e.ts.localeCompare(max) > 0 ? e.ts : max
    }, null)
  }
}
