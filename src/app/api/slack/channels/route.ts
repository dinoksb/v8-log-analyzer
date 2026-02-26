import { NextResponse } from 'next/server'
import { getTargetChannel } from '@/lib/slack'

export async function GET(): Promise<NextResponse> {
  try {
    const channel = await getTargetChannel()
    return NextResponse.json({ channels: [channel] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
