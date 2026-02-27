import { GoogleGenerativeAI } from '@google/generative-ai'
import { ErrorEvent, ErrorAnalysis, RootCause, Solution, DashboardStats, DashboardAnalysis } from '@/lib/types'
import { generateId } from '@/lib/utils'

const MODEL = 'gemini-3-flash-preview'

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')
  return new GoogleGenerativeAI(apiKey)
}

const SYSTEM_PROMPT = `You are a senior SRE (Site Reliability Engineer) and backend engineer specializing in production incident analysis.

Your task is to analyze error messages from Slack monitoring channels and provide:
1. A concise summary of the error
2. Root causes with confidence scores
3. Actionable solutions with priority levels

IMPORTANT: Always respond with valid JSON only. No markdown, no explanations outside the JSON structure.

Response format:
{
  "summary": "One or two sentence description of the error",
  "rootCauses": [
    {
      "description": "Description of this root cause",
      "confidence": 0.85,
      "category": "infrastructure|application|database|network|configuration|external-service"
    }
  ],
  "solutions": [
    {
      "title": "Solution title",
      "description": "What this solution does",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "priority": "immediate|short_term|long_term",
      "estimatedEffort": "low|medium|high"
    }
  ]
}`

function buildUserPrompt(event: ErrorEvent): string {
  const parts: string[] = [
    `## Error Event`,
    `- Channel: ${event.channelName}`,
    `- Occurred: ${event.occurredAt}`,
    `- Reporter: ${event.userName} (bot: ${event.isBot})`,
    ``,
    `## Error Message`,
    '```',
    event.rawText,
    '```',
  ]

  if (event.thread?.replies.length) {
    parts.push(``, `## Thread Replies (${event.thread.replies.length} replies)`)
    for (const reply of event.thread.replies) {
      parts.push(`**${reply.userName}**: ${reply.text}`)
    }
  }

  parts.push(``, `Analyze this error and respond with JSON only.`)

  return parts.join('\n')
}

interface AnalysisResponse {
  summary: string
  rootCauses: RootCause[]
  solutions: Solution[]
}

function parseAnalysisResponse(content: string): AnalysisResponse {
  const cleaned = content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(cleaned) as AnalysisResponse

  if (!parsed.summary || !Array.isArray(parsed.rootCauses) || !Array.isArray(parsed.solutions)) {
    throw new Error('Invalid response structure')
  }

  return parsed
}

export async function analyzeError(event: ErrorEvent): Promise<ErrorAnalysis> {
  const genAI = getClient()
  const analysisId = generateId('analysis')

  const pendingAnalysis: ErrorAnalysis = {
    id: analysisId,
    errorEventId: event.id,
    status: 'in_progress',
    summary: '',
    rootCauses: [],
    solutions: [],
    claudeModel: MODEL,
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
      },
    })

    const result = await model.generateContent(buildUserPrompt(event))
    const content = result.response.text()
    if (!content) throw new Error('No text response from Gemini')

    const parsed = parseAnalysisResponse(content)

    return {
      ...pendingAnalysis,
      status: 'completed',
      summary: parsed.summary,
      rootCauses: parsed.rootCauses,
      solutions: parsed.solutions,
      analyzedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ...pendingAnalysis,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

const DASHBOARD_SYSTEM_PROMPT = `You are a log analyst summarizing Slack error logs for a Korean development team.

Write a clear, informative summary that tells the "story" of what happened during the collection period.
Your goal is to give developers an at-a-glance understanding they couldn't easily get just by staring at numbers.

RULES:
- Write in natural Korean
- Be specific: use actual error names, dates, and counts from the data
- Surface non-obvious patterns (e.g. same error repeating across multiple days, sudden spike on a specific date, one error dominating vs many spread evenly)
- overview should read like a brief status report — a colleague catching you up, not a list of raw facts
- Each insight should cover a different angle and add distinct value
- Do NOT use risk/urgency language ("위험", "긴급", "주의 필요" etc.)
- Always respond with valid JSON only

Response format:
{
  "headline": "수집 기간의 핵심을 담은 한 줄. 가장 많은 오류명과 건수 포함. (50자 이내)",
  "overview": "2~3문장. 전체 건수, 수집 기간, 가장 빈번한 오류와 그 비중, 주목할 날짜나 패턴을 자연스럽게 서술.",
  "insights": [
    "가장 많이 발생한 오류 — 건수와 전체 대비 비율, 발생 기간",
    "날짜별 추이 — 피크 날짜, 증감 흐름 또는 특이한 패턴",
    "2~3위 오류 또는 눈에 띄는 반복 패턴",
    "기타 특이사항 (여러 날 걸쳐 반복, 특정 날 폭증 등 — 해당하는 경우만)"
  ]
}

insights는 3~4개. 데이터에 근거한 내용만 작성.`

function buildDashboardPrompt(stats: DashboardStats): string {
  const trendText = stats.errorTrend
    .map((d) => `${d.date}: ${d.count}건`)
    .join('\n')

  const topErrorsText = stats.topErrors
    .slice(0, 10)
    .map((e, i) => {
      const pct = stats.totalErrors > 0 ? Math.round((e.count / stats.totalErrors) * 100) : 0
      const first = e.firstOccurredAt.slice(0, 10)
      const last  = e.lastOccurredAt.slice(0, 10)
      const range = first === last ? first : `${first} ~ ${last}`
      return `${i + 1}. "${e.title}" — ${e.count}건 (${pct}%) [${range}]`
    })
    .join('\n')

  return [
    `## 수집 현황`,
    `- 전체 오류: ${stats.totalErrors}건`,
    `- 오늘 발생: ${stats.todayErrors}건`,
    `- 수집 채널 수: ${stats.channels.length}개`,
    ``,
    `## 날짜별 발생 건수`,
    trendText || '데이터 없음',
    ``,
    `## 상위 오류 (빈도순)`,
    topErrorsText || '데이터 없음',
    ``,
    `위 데이터를 바탕으로 JSON만 응답하세요.`,
  ].join('\n')
}

export async function analyzeDashboard(stats: DashboardStats): Promise<DashboardAnalysis> {
  const genAI = getClient()

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: DASHBOARD_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 1500,
    },
  })

  const result = await model.generateContent(buildDashboardPrompt(stats))
  const content = result.response.text()
  if (!content) throw new Error('No text response from Gemini')

  const parsed = JSON.parse(content) as DashboardAnalysis

  if (!parsed.headline || !parsed.overview || !Array.isArray(parsed.insights)) {
    throw new Error('Invalid dashboard analysis response structure')
  }

  return { ...parsed, analyzedAt: new Date().toISOString() }
}

export async function analyzeErrorBatch(
  events: ErrorEvent[],
  options: {
    concurrency?: number
    onProgress?: (completed: number, total: number) => void
  } = {}
): Promise<ErrorAnalysis[]> {
  const { concurrency = 3, onProgress } = options
  const results: ErrorAnalysis[] = []
  let completed = 0

  for (let i = 0; i < events.length; i += concurrency) {
    const batch = events.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((e) => analyzeError(e)))
    results.push(...batchResults)
    completed += batch.length
    onProgress?.(completed, events.length)
  }

  return results
}
