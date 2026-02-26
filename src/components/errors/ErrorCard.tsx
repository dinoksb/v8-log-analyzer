import Link from 'next/link'
import { ErrorEvent } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

interface Props {
  error: ErrorEvent
}

export function ErrorCard({ error }: Props) {
  return (
    <Link
      href={`/errors/${error.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-gray-900/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">#{error.channelName}</Badge>
            {error.analysis?.status === 'completed' && (
              <Badge variant="success">분석완료</Badge>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{error.title}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{error.userName}</span>
            <span>·</span>
            <span>{formatRelativeTime(error.occurredAt)}</span>
            {error.thread && (
              <>
                <span>·</span>
                <span>{error.thread.replies.length}개 답글</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
