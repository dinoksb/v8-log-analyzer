# 구현 계획: 대시보드 "표시 기간" 필터 추가
> 작성: 2026-02-27

---

## 1. 핵심 설계 결정

### URL 파라미터: `?view=7d` 단일 파라미터

| 값 | 의미 | 기간 |
|----|------|------|
| `1d` | 오늘 | KST 오늘 00:00 ~ 23:59:59 |
| `3d` | 최근 3일 | KST 3일 전 00:00 ~ 오늘 23:59:59 |
| `7d` | 최근 7일 (기본값) | KST 7일 전 00:00 ~ 오늘 23:59:59 |
| `30d` | 최근 30일 | |
| `all` | 전체 | 조건 없음 |

- 파라미터 없으면 `7d` 기본값
- `?from=...&to=...` 방식 기각 (불필요한 복잡도)

### DB 레벨 필터링
- 전체 로드 후 메모리 필터 대신 Supabase `.gte/.lte` 쿼리 조건 적용
- `loadAllErrorEvents(options?)` optional 파라미터로 하위호환 유지

### errorTrend 계산 방식 변경
- 기존: `channelStats[].daily` 집계 (30일 캐시 기반 → 뷰 필터와 불일치)
- 변경: `filteredErrors`에서 직접 날짜별 집계

---

## 2. 변경 파일 목록

| 파일 | 유형 | 담당 | 내용 |
|------|------|------|------|
| `src/lib/types.ts` | 수정 | 오케스트레이터 | `ViewPeriod` 타입, `DashboardStats.period` 필드 추가 |
| `src/lib/storage/adapter.ts` | 수정 | 오케스트레이터 | `loadAllErrorEvents(options?)` 시그니처 확장 |
| `src/lib/storage/supabase.ts` | 수정 | api-coder | options.from/to 시 `.gte/.lte` 쿼리 조건 추가 |
| `src/lib/storage/local.ts` | 수정 | api-coder | options 파라미터 수용, 메모리 날짜 필터링 |
| `src/lib/analysis.ts` | 수정 | ai-coder | period 결과 반환, errorTrend filteredErrors 기반 직접 계산 |
| `src/app/dashboard/page.tsx` | 수정 | ui-coder | searchParams Props, view 파싱, DashboardViewFilter 렌더링 |
| `src/components/dashboard/DashboardViewFilter.tsx` | **신규** | ui-coder | Client Component, 5개 버튼 그룹 |
| `src/components/dashboard/ErrorStats.tsx` | 수정 | ui-coder | `periodLabel` prop 추가, 기준 기간 문자열 표시 |

**실행 순서 (의존성 순):**
`types` → `adapter` → [`supabase` + `local`] → `analysis` → [`DashboardViewFilter` + `ErrorStats`] → `dashboard/page.tsx`

---

## 3. 상세 구현 명세

### 3.1 types.ts 변경

```typescript
export type ViewPeriod = '1d' | '3d' | '7d' | '30d' | 'all'

export interface DashboardStats {
  // ... 기존 필드 유지 ...
  period: {
    from: string    // KST YYYY-MM-DD
    to: string      // KST YYYY-MM-DD
    label: string   // "기준: 2026-02-21 ~ 2026-02-27 (7일)" 또는 "기준: 전체"
    view: ViewPeriod
  }
}
```

### 3.2 adapter.ts 변경

```typescript
export interface LoadErrorOptions {
  from?: string  // ISO 문자열 (UTC)
  to?: string    // ISO 문자열 (UTC)
}

export interface StorageAdapter {
  loadAllErrorEvents(options?: LoadErrorOptions): Promise<ErrorEvent[]>
  // ... 기존 메서드 유지 ...
}
```

### 3.3 supabase.ts 변경

```typescript
async loadAllErrorEvents(options?: LoadErrorOptions): Promise<ErrorEvent[]> {
  // 페이지네이션 루프 유지
  let query = this.client
    .from('error_events')
    .select('*')
    .order('occurred_at', { ascending: false })

  if (options?.from) query = query.gte('occurred_at', options.from)
  if (options?.to)   query = query.lte('occurred_at', options.to)

  // .range(from, from + PAGE_SIZE - 1) 적용 후 루프
}
```

### 3.4 analysis.ts 변경

```typescript
// viewPeriod 기반 UTC from/to 계산 (KST 자정 기준)
export function resolveViewPeriod(view: ViewPeriod): {
  fromUtc?: string
  toUtc?: string
  label: string
  fromKst: string
  toKst: string
}

// computeDashboardStats 시그니처 변경
export function computeDashboardStats(
  allErrors: ErrorEvent[],
  channelStats: ChannelStats[],
  view: ViewPeriod = '7d'
): DashboardStats
// DashboardStats.period 필드 포함 반환
// errorTrend: allErrors에서 직접 날짜별 집계 (channelStats.daily 대신)
```

**KST 자정 UTC 변환 (버그 방지):**
```typescript
const kstOffsetMs = 9 * 60 * 60 * 1000
const nowKstMs = Date.now() + kstOffsetMs
const kstTodayMidnightMs = nowKstMs - (nowKstMs % (24 * 60 * 60 * 1000))
const fromUtc = new Date(kstTodayMidnightMs - (N-1) * 86400000 - kstOffsetMs)
const toUtc   = new Date(kstTodayMidnightMs + 86400000 - 1 - kstOffsetMs)
```

### 3.5 DashboardViewFilter.tsx (신규)

```typescript
'use client'

const PERIODS = [
  { value: '1d', label: '오늘' },
  { value: '3d', label: '3일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
] as const

interface Props {
  currentView: ViewPeriod
}

export function DashboardViewFilter({ currentView }: Props) {
  // useRouter + useSearchParams로 URL 업데이트
  // 버튼 클릭 → router.push(`?view=${value}`)
  // active 버튼: bg-indigo-600 text-white
  // inactive 버튼: bg-gray-100 text-gray-600 hover:bg-gray-200
}
```

### 3.6 ErrorStats.tsx 변경

```typescript
interface Props {
  totalErrors: number
  todayErrors: number
  periodLabel: string  // "기준: 2026-02-21 ~ 2026-02-27 (7일)"
}
// periodLabel을 카드 하단 text-xs text-gray-400으로 표시
```

### 3.7 dashboard/page.tsx 변경

```typescript
interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams
  const view = (sp.view ?? '7d') as ViewPeriod

  // view 기반 UTC 범위 계산
  const { fromUtc, toUtc } = resolveViewPeriod(view)

  // 필터링된 데이터 로드
  const allErrors = await storage.loadAllErrorEvents({ from: fromUtc, to: toUtc })
  const stats = computeDashboardStats(allErrors, channelStats, view)

  return (
    <>
      <DateRangeFetcher />
      <Suspense><DashboardViewFilter currentView={view} /></Suspense>
      <ErrorStats
        totalErrors={stats.totalErrors}
        todayErrors={stats.todayErrors}
        periodLabel={stats.period.label}
      />
      {/* 나머지 컴포넌트 */}
    </>
  )
}
```

---

## 4. 주의사항

1. **KST 자정 UTC 변환**: `new Date("YYYY-MM-DD")` 금지. ms 연산으로 KST 자정 계산
2. **Supabase to 범위**: `occurred_at <= toISO` 에서 toISO = 해당 일 23:59:59.999 UTC (KST 다음날 00:00 - 1ms)
3. **DashboardViewFilter**: `useSearchParams` 사용 → `<Suspense>` 래핑 필수
4. **기존 호출부**: `errors/page.tsx`, `stats/route.ts`의 `loadAllErrorEvents()` 무수정 (optional 파라미터)
5. **errorTrend**: channelStats.daily 집계 코드 제거, allErrors 직접 집계로 대체

---

## 5. 검증 기준

- [ ] `pnpm type-check` 통과
- [ ] `pnpm lint` 통과
- [ ] `?view=` 없을 때 7d 기본값
- [ ] `?view=all` 전체 데이터 로드
- [ ] `?view=1d` KST 오늘 범위만 로드
- [ ] 새로고침 후 view 파라미터 유지
- [ ] periodLabel 형식 정확
- [ ] 기존 호출부 하위호환
- [ ] DashboardViewFilter Suspense 래핑
- [ ] errorTrend가 선택 기간 내 데이터만 반영
