import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'

interface RouteParams {
  params: Promise<{ errorId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { errorId } = await params
    const storage = getStorageAdapter()
    const allErrors = await storage.loadAllErrorEvents()
    const error = allErrors.find((e) => e.id === errorId)

    if (!error) {
      return NextResponse.json({ error: 'Error event not found' }, { status: 404 })
    }

    if (!error.analysis) {
      const analysis = await storage.loadAnalysis(errorId)
      if (analysis) {
        error.analysis = analysis
      }
    }

    return NextResponse.json({ error })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
