import { TopErrorItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatRelativeTime } from '@/lib/utils'

interface Props {
  items: TopErrorItem[]
}

export function TopErrors({ items }: Props) {
  const maxCount = items[0]?.count ?? 1

  return (
    <Card title="자주 발생한 오류">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">오류 데이터가 없습니다.</p>
      ) : (
        <ol
          className={`space-y-3 ${
            items.length > 10
              ? 'max-h-[520px] overflow-y-auto pr-1'
              : ''
          }`}
        >
          {items.map((item, index) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold text-gray-400 dark:text-gray-500">
                #{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {item.count.toLocaleString()}회
                  </span>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    최근 {formatRelativeTime(item.lastOccurredAt)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
