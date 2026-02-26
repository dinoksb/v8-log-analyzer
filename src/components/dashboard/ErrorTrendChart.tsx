'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DailyCount } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { useDarkMode } from '@/lib/hooks/useDarkMode'

interface Props {
  data: DailyCount[]
}

export function ErrorTrendChart({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const isDark = useDarkMode()
  const formatted = data.map((d) => ({
    ...d,
    date: d.date.slice(5),
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const tooltipStyle = {
    fontSize: 12,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    color: isDark ? '#f3f4f6' : '#111827',
  }

  return (
    <Card title="오류 추이 (일별)">
      {!mounted ? (
        <div style={{ height: 240 }} className="animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      ) : null}
      <ResponsiveContainer width="100%" height={mounted ? 240 : 0}>
        <AreaChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, '오류']} />
          <Area type="monotone" dataKey="count" name="오류" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
