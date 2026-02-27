import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorDetail } from '@/components/errors/ErrorDetail'
import { ErrorEvent } from '@/lib/types'
import { getStorageAdapter } from '@/lib/storage/factory'

interface Props {
  params: Promise<{ errorId: string }>
}

async function getError(errorId: string): Promise<ErrorEvent | null> {
  try {
    const storage = getStorageAdapter()
    const allErrors = await storage.loadAllErrorEvents()
    const error = allErrors.find((e) => e.id === errorId)
    if (!error) return null

    if (!error.analysis) {
      const analysis = await storage.loadAnalysis(errorId)
      if (analysis) error.analysis = analysis
    }

    return error
  } catch {
    return null
  }
}

export default async function ErrorDetailPage({ params }: Props) {
  const { errorId } = await params
  const error = await getError(errorId)

  if (!error) {
    notFound()
  }

  return (
    <>
      <Header
        title="오류 상세"
        description={`#${error.channelName}`}
        action={
          <Link
            href="/errors"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            ← 목록으로
          </Link>
        }
      />
      <PageContainer>
        <ErrorDetail error={error} />
      </PageContainer>
    </>
  )
}
