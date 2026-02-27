# Slack Analyzer

Slack 채널 메시지를 수집·분석·시각화하는 Next.js 웹앱.

## Tech Stack

- **Runtime**: Node.js, pnpm (npm/yarn 사용 금지)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: TailwindCSS v4
- **Package Manager**: pnpm

## File Structure

```
src/
├── app/                  # Next.js App Router (페이지, 레이아웃, API routes)
│   └── api/              # API routes (Slack 연동, 분석 엔드포인트)
├── components/           # React 컴포넌트
│   ├── charts/           # 차트/시각화 컴포넌트
│   └── ui/               # 공통 UI 컴포넌트
├── lib/                  # 유틸리티
│   ├── slack.ts          # Slack API 클라이언트
│   ├── analysis.ts       # 데이터 분석 로직
│   └── types.ts          # 공유 타입 정의
data/                     # Slack 수집 데이터 (JSON), 분석 결과
.claude/
├── commands/             # Custom slash commands (Skills)
├── agents/               # Custom sub-agents
├── reviews/              # 코드 리뷰 결과 저장
└── plans/                # 구현 계획서 저장 (/implement 파이프라인)
```

## Dev Commands

```bash
pnpm dev          # 개발 서버 (localhost:3000)
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint 검사
pnpm type-check   # TypeScript 타입 검사
```

## Code Conventions

- 함수형 컴포넌트 + hooks 사용
- Props 타입은 interface로 분리: `interface Props { ... }`
- import는 named export 우선: `import { useState } from 'react'`
- 컴포넌트 파일명 PascalCase, 유틸리티 camelCase
- API route handler는 `try/catch`로 감싸고 적절한 HTTP status 반환
- 환경변수는 반드시 `process.env`로 접근, 코드에 하드코딩 금지

## Environment Variables

```
SLACK_BOT_TOKEN=xoxb-...        # Slack Bot Token (필수)
SLACK_SIGNING_SECRET=...        # Slack Signing Secret
```

## Git Workflow (Mode A)

### 브랜치 전략
```
main          ← 프로덕션 (force push 금지)
└── feat/*    ← 기능 개발
└── fix/*     ← 버그 수정
└── refactor/* ← 리팩토링
└── chore/*   ← 설정/빌드 변경
```

### 전체 파이프라인
```
/branch feat/slack-collector   브랜치 생성
        ↓
  코드 작성
        ↓
  /commit    → diff 분석 → Conventional Commit 메시지 생성
        ↓ [husky] lint-staged → tsc → commitlint 자동 검증
        ↓
  /pr        → 커밋 이력 기반 PR description 자동 생성
        ↓
  /review-pr [번호]   → pr-reviewer agent (Mode A)
        ↓               리뷰 → 수정 → push → CI 확인 자동
        ↓ [SubagentStop] "pr-reviewer 완료. 머지 방식 선택하세요"
        ↓
  사용자가 머지 방식 선택 → gh pr merge 실행
```

### Git Hooks (husky)
| Hook | 실행 내용 |
|------|-----------|
| `pre-commit` | lint-staged (ESLint) + tsc 타입 검사 |
| `commit-msg` | commitlint (Conventional Commits 형식 강제) |

### Commit 메시지 형식
```
<type>(<scope>): <subject>

타입: feat, fix, refactor, style, docs, test, chore, perf, ci, revert
스코프: slack, api, components, charts, lib, analysis, auth, data, config, ui
```

## Available Skills

| 명령어 | 설명 |
|--------|------|
| `/branch` | 컨벤션 브랜치 생성 |
| `/commit` | diff 분석 후 Conventional Commit |
| `/pr` | 현재 브랜치로 PR 생성 |
| `/review-pr` | PR 자동 리뷰·수정·머지 (Mode A) |
| `/fetch-slack` | Slack 채널 메시지 수집 |
| `/analyze` | 수집 데이터 분석 실행 |
| `/gen-component` | 분석 결과 시각화 컴포넌트 생성 |
| `/review` | 현재 변경 파일 코드 리뷰 |
| `/refactor` | 리뷰 결과 기반 리팩토링 실행 |

## Available Agents

| Agent | 역할 |
|-------|------|
| `pr-reviewer` | PR 리뷰·수정·푸시 자동화 (Mode A, 머지는 사용자 확인) |
| `code-reviewer` | 코드 품질·보안·패턴 리뷰 |
| `data-validator` | Slack JSON 데이터 품질 검증 |
| `trend-analyzer` | 메시지 트렌드·키워드 분석 |

## Important Rules

- `data/` 폴더의 JSON 파일은 직접 수정 금지 (수집 스크립트로만 생성)
- API route 수정 시 에러 핸들링 확인 필수
- `.env` 파일은 절대 커밋 금지
