/**
 * Migration script: local data/ -> Supabase
 * Usage: pnpm migrate
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { ErrorEvent, ChannelStats } from '../src/lib/types'

const DATA_DIR = path.join(process.cwd(), 'data')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function migrateChannel(channelId: string): Promise<void> {
  console.log(`\nMigrating channel: ${channelId}`)
  const channelDir = path.join(DATA_DIR, channelId)

  // Migrate error events
  const errorsPath = path.join(channelDir, 'errors.json')
  const errors = await readJson<ErrorEvent[]>(errorsPath)

  if (errors && errors.length > 0) {
    console.log(`  Uploading ${errors.length} error events...`)

    const rows = errors.map((e) => ({
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
    }))

    const BATCH_SIZE = 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('error_events').upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error(`  Error uploading batch ${i / BATCH_SIZE + 1}:`, error.message)
      } else {
        console.log(`  Batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)} done`)
      }
    }

    // Migrate embedded analyses
    const analysisRows = errors
      .filter((e) => e.analysis)
      .map((e) => ({
        id: e.analysis!.id,
        error_event_id: e.analysis!.errorEventId,
        status: e.analysis!.status,
        summary: e.analysis!.summary,
        root_causes: e.analysis!.rootCauses,
        solutions: e.analysis!.solutions,
        analyzed_at: e.analysis!.analyzedAt ?? null,
        claude_model: e.analysis!.claudeModel,
        error_message: e.analysis!.errorMessage ?? null,
      }))

    if (analysisRows.length > 0) {
      console.log(`  Uploading ${analysisRows.length} analyses...`)
      const { error } = await supabase
        .from('error_analyses')
        .upsert(analysisRows, { onConflict: 'id' })
      if (error) console.error('  Error uploading analyses:', error.message)
      else console.log('  Analyses uploaded')
    }
  } else {
    console.log('  No errors found')
  }

  // Migrate stats
  const statsPath = path.join(channelDir, 'stats.json')
  const stats = await readJson<ChannelStats>(statsPath)

  if (stats) {
    console.log('  Uploading stats...')
    const { error } = await supabase.from('channel_stats').upsert(
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
    if (error) console.error('  Error uploading stats:', error.message)
    else console.log('  Stats uploaded')
  }
}

async function main(): Promise<void> {
  console.log('Starting migration to Supabase...')
  console.log(`Data directory: ${DATA_DIR}`)

  let entries: { name: string; isDirectory: () => boolean }[]
  try {
    entries = await fs.readdir(DATA_DIR, { withFileTypes: true })
  } catch {
    console.error(`Data directory not found: ${DATA_DIR}`)
    process.exit(1)
  }

  const channels = entries.filter((e) => e.isDirectory() && e.name !== 'analyses').map((e) => e.name)

  if (channels.length === 0) {
    console.log('No channel data found to migrate')
    return
  }

  console.log(`Found ${channels.length} channel(s): ${channels.join(', ')}`)

  for (const channel of channels) {
    await migrateChannel(channel)
  }

  console.log('\nMigration complete!')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
