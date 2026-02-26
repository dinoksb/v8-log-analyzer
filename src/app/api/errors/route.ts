import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import { filterErrors, paginateErrors } from '@/lib/analysis'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const channel = searchParams.get('channel') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)
    const hasAnalysisParam = searchParams.get('hasAnalysis')
    const hasAnalysis = hasAnalysisParam === null ? undefined : hasAnalysisParam === 'true'

    const storage = getStorageAdapter()
    let errors = await storage.loadAllErrorEvents()

    errors = errors.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    const filtered = filterErrors(errors, {
      channel,
      search,
      hasAnalysis,
    })

    const { errors: paginated, total, totalPages } = paginateErrors(filtered, page, pageSize)

    return NextResponse.json({
      errors: paginated,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
