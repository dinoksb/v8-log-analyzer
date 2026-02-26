# /implement — 코드 변경 전 전체 에이전트 협업 파이프라인

코드를 수정하기 전에 **반드시** 이 파이프라인을 실행합니다.
Explore → Architect → 사용자 승인 → Code Writing → code-reviewer → Refactoring → 최종 적용
각 단계는 에이전트가 이전 에이전트의 결과를 받아 이어서 작업합니다.

## 사용법
```
/implement <태스크 설명>
/implement "사용자 인증 기능 추가"
/implement "Dashboard 컴포넌트에 다크모드 토글 추가"
/implement src/components/Dashboard.tsx "에러 바운더리 추가"
```

## 파이프라인 흐름

```
[Phase 1] Explore Agent    → 코드베이스 구조 분석 보고서 생성
              ↓ (보고서 전달)
[Phase 2] Architect Agent  → 분석 보고서 기반 구현 계획서 수립 + 코더 에이전트 라우팅 테이블 작성
              ↓
[Phase 3] 사용자 승인        → 계획서 검토 및 승인 (EnterPlanMode)
              ↓ (승인 후)
[Phase 4] 전문 코더 에이전트  → 계획서 라우팅 테이블 기준으로 파일 유형별 담당 에이전트 실행
  ├─ ui-coder   → src/components/**/*.tsx, page.tsx, layout.tsx
  ├─ api-coder  → src/app/api/**/*.ts
  ├─ ai-coder   → src/lib/claude.ts, analysis.ts, AI 관련 파일
  └─ (오케스트레이터 직접) → src/lib/utils.ts, types.ts 등 단순 파일
              ↓ (작성된 코드 전달)
[Phase 4.5] test-writer    → 신규 src/lib/*.ts 파일 존재 시 자동 실행 (선택)
              ↓
[Phase 5] code-reviewer    → 코드 품질·보안·패턴 리뷰 보고서 생성
              ↓ (리뷰 결과 전달)
[Phase 6] Refactoring      → Critical/Warning 이슈 코드에 반영
              ↓
[Phase 7] Final Apply      → 최종 코드 검증 및 완료 보고
```

---

## 실행 절차

### Phase 1: 구조 파악 (Explore Agent)

Task tool로 **Explore 에이전트**를 실행합니다.

프롬프트 예시:
```
태스크: [사용자의 $ARGUMENTS]
다음을 분석해주세요:
1. 태스크와 관련된 기존 파일, 컴포넌트, 유틸리티 탐색
2. src/lib/types.ts의 관련 타입 정의 확인
3. 유사 기능의 기존 구현 패턴 (Props interface, 에러 처리 방식 등)
4. 변경 시 영향받는 파일 범위
5. 현재 아키텍처에서 이 태스크를 구현하기 위한 진입점(entry point)

결과물: 구조 분석 보고서 (관련 파일 목록, 기존 패턴, 영향 범위 포함)
```

Explore 에이전트의 **구조 분석 보고서**를 수집합니다.

---

### Phase 2: 계획 수립 (Architect Agent)

Phase 1 결과를 포함하여 **architect 에이전트**를 Task tool로 실행합니다.

프롬프트 예시:
```
태스크: [사용자의 $ARGUMENTS]

[Phase 1 구조 분석 보고서 전문 삽입]

위 구조 분석을 바탕으로:
1. 변경/생성할 파일 목록과 각 파일의 역할 정의
2. 단계별 구현 순서 (의존성 순서 고려)
3. 아키텍처 결정 사항 (접근법 선택 이유, 대안 비교)
4. 주의사항 및 잠재적 문제점
5. 완료 검증 기준

계획서를 .claude/plans/[YYYYMMDD-HHMMSS]-[태스크명].md 에 저장하도록 안내 포함
```

Architect 에이전트의 **구현 계획서**를 `.claude/plans/` 에 저장합니다.

---

### Phase 3: 사용자 승인

계획서를 사용자에게 표시하고 승인을 요청합니다.

- 계획서 전문을 출력
- **EnterPlanMode** 진입하여 승인 대기
- 사용자가 수정 요청 시: architect 에이전트를 재실행하여 계획서 갱신
- **승인 없이 코드 작성 단계로 절대 진행하지 않습니다**

---

### Phase 4: 전문 코더 에이전트 실행 (승인 후만 실행)

계획서의 **"코더 에이전트 라우팅"** 테이블을 참조하여 파일 유형별 전문 에이전트를 실행합니다.

#### 라우팅 규칙

| 파일 패턴 | 담당 에이전트 |
|-----------|-------------|
| `src/components/**/*.tsx` | **ui-coder** |
| `src/app/**/page.tsx`, `layout.tsx` | **ui-coder** |
| `src/app/api/**/*.ts` | **api-coder** |
| `src/lib/claude.ts`, `analysis.ts`, AI 관련 | **ai-coder** |
| `src/lib/utils.ts`, `types.ts`, 단순 유틸 | 오케스트레이터 직접 작성 |

#### 실행 방법

1. 계획서 라우팅 테이블에서 담당 에이전트 그룹 확인
2. **의존성 순서대로** 에이전트 실행 (types → lib → api → components → page)
3. 각 에이전트 실행 시 다음을 프롬프트에 포함:
   - 승인된 계획서 전문
   - 이전 에이전트가 작성한 파일 목록 (컨텍스트 연결)
   - 담당할 파일 목록 명시

```
[ui-coder 프롬프트 예시]
계획서: [계획서 전문]
이전 단계 작성 파일: [api-coder가 작성한 파일 목록]
담당 파일: src/components/Foo.tsx, src/app/dashboard/page.tsx
위 파일들을 계획서에 따라 작성해주세요.
```

4. 각 에이전트의 완료 보고에서 작성된 파일 목록 수집
5. 오케스트레이터가 직접 처리할 단순 파일이 있으면 직접 작성

**전체 규칙 (모든 에이전트 공통):**
- 기존 파일 수정보다 **신규 파일 생성 우선**
- Props interface 분리, named export, try/catch, TailwindCSS 전용, process.env

---

### Phase 4.5: 테스트 작성 (test-writer Agent, 선택적)

**자동 실행 조건:** Phase 4에서 `src/lib/*.ts` 신규 파일이 1개 이상 생성된 경우

Task tool로 **test-writer 에이전트**를 실행합니다.

```
[test-writer 프롬프트 예시]
Phase 4에서 신규 생성된 lib 파일들:
- src/lib/analysis.ts
- src/lib/utils.ts

위 파일들의 vitest 단위 테스트를 작성해주세요.
```

test-writer 결과에서 테스트 파일 목록과 통과 여부를 확인합니다.

---

### Phase 5: 코드 리뷰 (code-reviewer Agent)

Phase 4에서 작성된 **모든 파일**에 대해 **code-reviewer 에이전트**를 Task tool로 실행합니다.

프롬프트 예시:
```
다음 파일들을 리뷰해주세요:
[Phase 4에서 작성/수정된 파일 경로 목록]

리뷰 완료 후 결과를 .claude/reviews/[YYYYMMDD-HHMMSS]-[파일명].md 에 저장하세요.
```

리뷰 결과에서 Critical/Warning/Suggestion 이슈 목록을 추출합니다.

---

### Phase 6: 리팩토링 적용

code-reviewer의 리뷰 결과를 바탕으로:

1. **🔴 Critical 이슈**: 즉시 자동 수정 (사용자 확인 없이 적용)
2. **🟡 Warning 이슈**: 수정 내용을 사용자에게 보여주고 확인 후 적용
3. **🔵 Suggestion**: 목록만 표시 (적용 여부는 사용자 선택)

수정 후 lint 재실행으로 검증합니다.

---

### Phase 7: 최종 보고

파이프라인 완료 후 다음 형식으로 요약 출력:

```
══════════════════════════════════════
 /implement 파이프라인 완료
══════════════════════════════════════
태스크   : [태스크 설명]
생성 파일: N개 ([파일 목록])
수정 파일: N개 ([파일 목록])
리뷰 등급: [A/B/C/D]
해결 이슈: Critical N건, Warning N건
잔여 이슈: Suggestion N건

→ 다음 단계:
  /commit  변경사항 커밋
  /pr      Pull Request 생성
══════════════════════════════════════
```

---

## 에이전트 간 대화 구조

```
사용자 ──→ /implement 실행
              │
              ▼
         [Explore Agent]
         "구조를 분석했습니다. 관련 파일: ..."
              │ 분석 보고서 전달
              ▼
         [Architect Agent]
         "보고서를 바탕으로 계획을 수립했습니다: ..."
              │ 계획서 전달
              ▼
         [사용자 승인]
         "이 계획으로 진행하겠습니다"
              │ 승인
              ▼
         [Code Writing]
         "계획대로 파일을 작성했습니다: ..."
              │ 작성 파일 목록 전달
              ▼
         [code-reviewer Agent]
         "리뷰 결과: Critical 2건, Warning 1건 ..."
              │ 리뷰 결과 전달
              ▼
         [Refactoring]
         "Critical 이슈 2건 수정 완료: ..."
              │
              ▼
         [완료 보고] ──→ 사용자
```

---

## 주의사항

- **Phase 3 사용자 승인 없이 코드 작성(Phase 4)으로 절대 진행 금지**
- `data/` 폴더의 JSON 파일 수정 금지
- `.env` 파일 수정 금지
- 로직 변경이 필요한 리팩토링은 사용자 확인 후 진행
- 각 Phase의 결과물을 다음 Phase의 프롬프트에 반드시 포함 (에이전트 간 컨텍스트 연결)
