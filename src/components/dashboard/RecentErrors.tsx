import Link from 'next/link'
import { ErrorEvent } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatDateTime } from '@/lib/utils'

interface Props {
  errors: ErrorEvent[]
}

export function RecentErrors({ errors }: Props) {
  return (
    <Card title="최근 발생 오류">
      {errors.length === 0 ? (
        <p className="text-sm text-gray-400">오류 데이터가 없습니다.</p>
      ) : (
        <ul
          className={`divide-y divide-gray-100 dark:divide-gray-700 ${
            errors.length > 10 ? 'max-h-[720px] overflow-y-auto' : ''
          }`}
        >
          {errors.map((error) => (
            <li key={error.id} className="py-3">
              <Link
                href={`/errors/${error.id}`}
                className="group flex items-start gap-3 hover:opacity-80"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:underline dark:text-gray-100">
                    {error.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    #{error.channelName} · {formatDateTime(error.occurredAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
