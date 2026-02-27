# Code Review: dashboard-view-filter (8개 파일)
> 리뷰 일시: 2026-02-27 | 등급: B

## 종합 평가
Critical 0건. ViewPeriod 기반 뷰 필터 아키텍처는 올바름. Warning 4건 수정 권장.

---

## 🟡 Warning (4건)

| # | 파일 | 위치 | 설명 |
|---|------|------|------|
| W1 | `analysis.ts` | L107 | `getHours()` UTC 기준 - KST byHour 9시간 오차 |
| W2 | `page.tsx` | L52 | `as ViewPeriod` 타입 단언 + ViewPeriod 배열 중복 정의 |
| W3 | `local.ts` | L102-103 | ISO 포맷 보장 없는 문자열 날짜 비교 |
| W4 | `supabase.ts` | rowToErrorEvent | 전 필드 `as` 단언 - 런타임 검증 없음 |

## 🔵 Suggestion (5건)

| # | 파일 | 설명 |
|---|------|------|
| S1 | `types.ts` | `as const` 배열에서 ViewPeriod union 도출 |
| S2 | `DashboardViewFilter.tsx` | `radiogroup`+`aria-checked` 패턴 검토 |
| S3 | `ErrorStats.tsx` | `sm:grid-cols-2 lg:grid-cols-2` 중복 클래스 제거 |
| S4 | `page.tsx` | catch 블록 `console.error` 추가 |
| S5 | `adapter.ts` | `<=` 경계 포함 주석 명시 |
