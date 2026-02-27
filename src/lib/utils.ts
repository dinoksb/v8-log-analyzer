export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return formatDate(d)
}

export function slackTsToDate(ts: string): Date {
  const seconds = parseFloat(ts)
  return new Date(seconds * 1000)
}

export function extractErrorTitle(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim())
  if (!lines.length) return '(빈 메시지)'

  let firstLine = lines[0].trim()

  // Slack 이모지 shortcode 제거: ":rotating_light:" 등 선행 shortcode 제거
  firstLine = firstLine.replace(/^(:\w+:\s*)+/, '')

  // agent8 포맷 제거: "Agent8 Error: {message}"
  const agent8Match = firstLine.match(/^\u{1F6A8}?\s*Agent8\s+Error:\s*(.+)$/iu)
  if (agent8Match) firstLine = agent8Match[1].trim()

  if (firstLine.length <= 100) return firstLine
  return firstLine.substring(0, 97) + '...'
}

export function extractTags(text: string): string[] {
  const tags: string[] = []

  const httpMatch = text.match(/\b[45]\d{2}\b/)
  if (httpMatch) tags.push(`HTTP ${httpMatch[0]}`)

  const serviceMatch = text.match(/\b([A-Z][a-z]+Service|[A-Z][a-z]+Controller|[A-Z][a-z]+Handler)\b/)
  if (serviceMatch) tags.push(serviceMatch[1])

  const stackMatch = /(?:at|Exception|Error)/.test(text)
  if (stackMatch) tags.push('stack-trace')

  return [...new Set(tags)]
}

export function buildSlackUrl(channel: string, ts: string): string {
  const tsNoDot = ts.replace('.', '')
  return `https://app.slack.com/archives/${channel}/p${tsNoDot}`
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function getPriorityLabel(priority: 'immediate' | 'short_term' | 'long_term'): string {
  switch (priority) {
    case 'immediate': return '즉시'
    case 'short_term': return '단기'
    case 'long_term': return '장기'
  }
}

export function getEffortLabel(effort: 'low' | 'medium' | 'high'): string {
  switch (effort) {
    case 'low': return '낮음'
    case 'medium': return '보통'
    case 'high': return '높음'
  }
}
