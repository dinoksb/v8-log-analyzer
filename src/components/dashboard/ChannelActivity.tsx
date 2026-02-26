'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChannelActivityItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { useDarkMode } from '@/lib/hooks/useDarkMode'

interface Props {
  data: ChannelActivityItem[]
}

export function ChannelActivity({ data }: Props) {
  const isDark = useDarkMode()
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const tooltipStyle = {
    fontSize: 12,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    color: isDark ? '#f3f4f6' : '#111827',
  }

  if (data.length === 0) {
    return (
      <Card title="채널별 오류">
        <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-gray-500">데이터 없음</div>
      </Card>
    )
  }

  return (
    <Card title="채널별 오류">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="channelName" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: tickColor }} />
          <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" />
          <Bar dataKey="high" name="High" stackId="a" fill="#f97316" />
          <Bar dataKey="medium" name="Medium" stackId="a" fill="#eab308" />
          <Bar dataKey="low" name="Low" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
