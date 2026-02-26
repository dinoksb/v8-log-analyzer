import { ErrorEvent } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDateTime, buildSlackUrl } from '@/lib/utils'

interface Props {
  error: ErrorEvent
}

interface DetailRowProps {
  label: string
  value: string | number
  mono?: boolean
}

function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-100 last:border-0 dark:border-gray-700">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className={`text-xs text-gray-900 dark:text-gray-100 break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function ErrorDetail({ error }: Props) {
  const slackUrl = buildSlackUrl(error.channel, error.ts)
  const d = error.errorDetail

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">#{error.channelName}</Badge>
              {error.tags.map((tag) => (
                <Badge key={tag} variant="info">{tag}</Badge>
              ))}
            </div>
            <a
              href={slackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4A154B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#611f69] transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Slack에서 보기
            </a>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{error.title}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">발생 시각:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">{formatDateTime(error.occurredAt)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">보고자:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">{error.userName}</span>
              {error.isBot && <Badge variant="info" className="ml-1">Bot</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {d && (
        <Card title="오류 상세 정보">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {d.name && <DetailRow label="Error Name" value={d.name} mono />}
            {d.errorMessage && <DetailRow label="Error Message" value={d.errorMessage} mono />}
            {d.context && <DetailRow label="Context" value={d.context} />}
            {d.process && <DetailRow label="Process" value={d.process} />}
            {d.version && <DetailRow label="Version" value={d.version} mono />}
            {d.time && <DetailRow label="발생 시각" value={d.time} mono />}
            {d.elapsedTime !== undefined && (
              <DetailRow label="소요 시간" value={`${d.elapsedTime.toLocaleString()} ms`} />
            )}
            {d.userId && <DetailRow label="User ID" value={d.userId} mono />}
            {d.url && <DetailRow label="Page URL" value={d.url} mono />}
            {d.userAgent && <DetailRow label="User Agent" value={d.userAgent} />}
            {d.sentryEventId && <DetailRow label="Sentry Event ID" value={d.sentryEventId} mono />}
            {d.prompt && (
              <div className="py-2">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">User Prompt</p>
                <p className="rounded bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {d.prompt}
                </p>
              </div>
            )}
            {d.stack && (
              <div className="py-2">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Stack Trace</p>
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {d.stack}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="원문 메시지">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-gray-700 dark:text-gray-300">
          <code>{error.rawText}</code>
        </pre>
      </Card>
    </div>
  )
}
