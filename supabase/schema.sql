-- Supabase Schema for Slack Analyzer
-- Run this in the Supabase SQL Editor

-- Error Events Table
CREATE TABLE IF NOT EXISTS error_events (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  ts TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  thread JSONB,
  analysis JSONB,
  tags TEXT[] DEFAULT '{}',
  error_detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_error_events_channel_ts ON error_events(channel, ts);
CREATE INDEX IF NOT EXISTS idx_error_events_occurred_at ON error_events(occurred_at DESC);

-- Error Analyses Table
CREATE TABLE IF NOT EXISTS error_analyses (
  id TEXT PRIMARY KEY,
  error_event_id TEXT NOT NULL REFERENCES error_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT NOT NULL DEFAULT '',
  root_causes JSONB NOT NULL DEFAULT '[]',
  solutions JSONB NOT NULL DEFAULT '[]',
  analyzed_at TIMESTAMPTZ,
  claude_model TEXT NOT NULL DEFAULT '',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_analyses_event_id ON error_analyses(error_event_id);

-- Channel Stats Table
CREATE TABLE IF NOT EXISTS channel_stats (
  channel TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  period_from TIMESTAMPTZ NOT NULL,
  period_to TIMESTAMPTZ NOT NULL,
  period_days INTEGER NOT NULL,
  total_errors INTEGER NOT NULL DEFAULT 0,
  daily JSONB NOT NULL DEFAULT '[]',
  by_hour JSONB NOT NULL DEFAULT '[]',
  analysis_completed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw Fetches Table (optional, stores raw Slack fetch data)
CREATE TABLE IF NOT EXISTS raw_fetches (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  days INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_fetches_channel ON raw_fetches(channel);

-- Fetch Jobs Table (replaces in-memory jobStore for Vercel compatibility)
CREATE TABLE IF NOT EXISTS fetch_jobs (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB NOT NULL DEFAULT '{"step":"init","current":0,"total":0,"message":"수집 준비 중..."}',
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fetch_jobs_channel_status ON fetch_jobs(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_fetch_jobs_started_at ON fetch_jobs(started_at DESC);
