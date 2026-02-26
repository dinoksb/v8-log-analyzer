# /test — 테스트 작성 및 실행

대상 파일을 분석해 단위 테스트를 작성하고 실행합니다.

## 사용법
```
/test src/lib/slack.ts          # 특정 파일의 테스트 작성 + 실행
/test src/lib/analysis.ts       # 순수 함수 테스트
/test                           # 전체 테스트 스위트 실행
```

## 실행 절차

### $ARGUMENTS가 있는 경우 (테스트 작성 모드)

1. **대상 파일 읽기**
   - `$ARGUMENTS` 경로의 파일을 읽고 export된 함수/타입 파악

2. **기존 테스트 파일 확인**
   - `src/lib/__tests__/<filename>.test.ts` 존재 여부 확인
   - 있으면: 커버되지 않은 케이스만 추가
   - 없으면: 신규 작성

3. **테스트 케이스 설계 원칙**
   - 외부 API/모듈(Slack, Claude, fs 등)은 반드시 `vi.mock` + `vi.hoisted` 패턴으로 mock
   - **정상 케이스**: 함수의 기대 출력 검증
   - **경계값**: 빈 배열, null, 0, 최대값
   - **오류 케이스**: throw, reject, 잘못된 입력
   - **API 호출 패턴**: 호출 횟수(`toHaveBeenCalledTimes`), 인자(`toHaveBeenCalledWith`), 쓰로틀 간격

4. **테스트 파일 작성**
   - 경로: `src/lib/__tests__/<filename>.test.ts`
   - mock은 파일 상단 `vi.hoisted()` → `vi.mock()` 순서로 선언
   - `describe` 블록은 함수 단위로 구성
   - 테스트명은 한국어로 동작을 구체적으로 서술

5. **실행 및 결과 확인**
   ```bash
   pnpm exec vitest run src/lib/__tests__/<filename>.test.ts
   ```
   - 실패 시: 원인 분석 후 테스트 또는 구현 수정
   - 통과 시: 커버리지 확인 (`pnpm test:coverage`)

### $ARGUMENTS가 없는 경우 (전체 실행 모드)

```bash
pnpm test
```
실패한 테스트만 출력하고 원인을 분석합니다.

## Mock 패턴 참고

```typescript
// 클래스 생성자 mock (WebClient 등)
const { mockMethod } = vi.hoisted(() => ({
  mockMethod: vi.fn(),
}))

vi.mock('some-package', () => ({
  SomeClass: class {
    method = mockMethod
  },
}))

// 파일시스템 mock
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))
```

## 주의사항
- `src/lib/storage/local.ts`는 `fs/promises`를 mock해야 테스트 가능
- 외부 API 실제 호출 금지 — 반드시 mock 사용
- `vi.useFakeTimers()` + `vi.runAllTimersAsync()`로 sleep/setTimeout 처리
