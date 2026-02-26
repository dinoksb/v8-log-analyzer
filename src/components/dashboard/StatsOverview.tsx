interface StatCard {
  label: string
  value: number | string
  description?: string
  color: string
}

interface Props {
  totalErrors: number
  analysisCompletedRate: number
  todayErrors: number
}

export function StatsOverview({ totalErrors, analysisCompletedRate, todayErrors }: Props) {
  const stats: StatCard[] = [
    {
      label: '전체 오류',
      value: totalErrors.toLocaleString(),
      description: '수집된 모든 오류',
      color: 'text-gray-900 dark:text-gray-100',
    },
    {
      label: '분석 완료율',
      value: `${analysisCompletedRate}%`,
      description: 'AI 분석 완료',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: '오늘 발생',
      value: todayErrors.toLocaleString(),
      description: '오늘 기준',
      color: 'text-indigo-600 dark:text-indigo-400',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
          <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          {stat.description && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{stat.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
