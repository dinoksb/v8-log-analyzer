interface Props {
  totalErrors: number
  todayErrors: number
}

function StatCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value.toLocaleString()}</span>
    </div>
  )
}

export function ErrorStats({ totalErrors, todayErrors }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2">
      <StatCard label="전체 오류" value={totalErrors} colorClass="text-gray-900 dark:text-gray-100" />
      <StatCard label="오늘 발생" value={todayErrors} colorClass="text-indigo-600 dark:text-indigo-400" />
    </div>
  )
}
