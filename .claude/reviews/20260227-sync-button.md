# Code Review: sync-button (6개 파일)
> 리뷰 일시: 2026-02-27

## 종합 평가
**등급**: C

**요약**: 동기화 기능의 핵심 로직은 동작하지만, route handler가 단일 책임을 위반하고 있으며 Vercel 60초 제한 내에 AI 분석까지 동기 실행하는 timeout 위험이 존재합니다. SyncButton 컴포넌트가 컨벤션을 위반해 직접 API를 호출하고, 에러를 무시하는 패턴이 여러 곳에 있습니다.

---

## 발견된 이슈

### Critical (반드시 수정)

**[route.ts L99-117] Vercel timeout 위험 — AI 분석을 동기 실행**
- Slack 수집 완료 후 `analyzeDashboard()`(AI API 호출)를 동기적으로 실행. `maxDuration = 60`이지만 Slack 수집 + AI 분석이 60초를 초과하면 Vercel이 요청을 강제 종료.

**[route.ts L73-93] route handler 내 merge 로직 — SRP 위반**
- `collectChannelErrors`, merge, `computeChannelStats`, `analyzeDashboard`, `revalidatePath`가 하나의 handler에 집약.

**[SyncButton.tsx L23-31] 컴포넌트 내 직접 API 호출 — 컨벤션 위반**
- `useEffect` 내에서 `fetch('/api/slack/channels')`를 직접 호출.

**[SyncButton.tsx L29] 채널 로드 에러 무시 — 사용자 피드백 없음**
- `.catch(() => {})` 패턴으로 채널 로드 실패를 완전히 삼킴.

### Warning (수정 권장)

**[route.ts L122] newErrorCount 계산 — O(N×M) 복잡도**
- `newErrors.filter((e) => !existingErrors.some((ex) => ex.ts === e.ts))` 패턴이 이미 생성한 `mergedMap`을 재활용하지 않고 중첩 순회.

**[route.ts L26] request.json() 파싱 에러 미처리**
- 빈 body나 JSON이 아닌 요청이 들어오면 500 반환.

**[dashboard/page.tsx L45] 에러 로깅 없음**
- `getDashboardStats`의 catch 블록이 `return null`만 하고 에러를 로깅하지 않음.

### Suggestion (선택적 개선)

- `SyncButton.tsx L60`: 서버 응답 `fetchedAt` 미사용 (클라이언트 시각 사용 중)
- `supabase.ts listChannels`: 전체 테이블 스캔 후 클라이언트 중복 제거
- 공유 타입: `SyncResponse`가 route.ts와 SyncButton.tsx에 중복 정의
