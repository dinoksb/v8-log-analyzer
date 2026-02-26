import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import { fetchAndParseErrorDetail } from '@/lib/slack'

interface Props {
  params: Promise<{ errorId: string }>
}

export async function POST(request: NextRequest, { params }: Props): Promise<NextResponse> {
  try {
    const { errorId } = await params

    const storage = getStorageAdapter()
    const errors = await storage.loadAllErrorEvents()
    const error = errors.find((e) => e.id === errorId)

    if (!error) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 })
    }

    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured' }, { status: 503 })
    }

    const errorDetail = await fetchAndParseErrorDetail(error.channel, error.ts, token)

    if (Object.keys(errorDetail).length === 0) {
      return NextResponse.json({ error: 'No detail data found in Slack thread' }, { status: 404 })
    }

    await storage.updateErrorEvent(errorId, { errorDetail })

    return NextResponse.json({ errorDetail })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
