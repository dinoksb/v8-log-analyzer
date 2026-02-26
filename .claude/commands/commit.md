# /commit — 스마트 Conventional Commit

git diff를 분석해 Conventional Commit 메시지를 자동 생성하고 커밋합니다.
husky pre-commit(lint-staged + tsc)과 commit-msg(commitlint)가 자동 실행됩니다.

## 사용법
```
/commit              # 전체 변경사항 자동 분석 후 커밋
/commit staged       # 이미 스테이징된 파일만 커밋
```

## 실행 절차

1. **변경사항 파악**
   ```bash
   git status
   git diff HEAD --stat
   ```

2. **diff 분석으로 커밋 타입 결정**

   | 변경 내용 | type |
   |-----------|------|
   | 새 파일, 새 기능 추가 | `feat` |
   | 버그 수정 | `fix` |
   | 동작 변경 없는 코드 개선 | `refactor` |
   | 스타일, 포맷 변경 | `style` |
   | 문서 변경 | `docs` |
   | 테스트 추가/수정 | `test` |
   | 빌드, 설정 변경 | `chore` |
   | 성능 개선 | `perf` |

3. **scope 자동 추론** (파일 경로 기반)

   | 경로 | scope |
   |------|-------|
   | `src/lib/slack*` | `slack` |
   | `src/app/api/` | `api` |
   | `src/components/charts/` | `charts` |
   | `src/components/ui/` | `ui` |
   | `src/lib/analysis*` | `analysis` |
   | `src/lib/` | `lib` |
   | `*.config.*`, `.husky/` | `config` |

4. **커밋 메시지 초안 작성**
   ```
   형식: <type>(<scope>): <subject>

   [body: 변경 이유 및 주요 내용 - 선택]

   [footer: 이슈 참조 - 선택]
   ```
   - subject: 72자 이내, 소문자, 명령형
   - 최근 리뷰 결과(`.claude/reviews/`)가 있으면 참조해 메시지 품질 향상

5. **메시지 확인 후 커밋**
   - 생성된 메시지를 사용자에게 보여주고 확인
   - 수정 요청 시 반영 후 재확인
   - 승인 시:
     ```bash
     git add -A        # staged 아닌 경우
     git commit -m "..."
     ```
   - husky가 자동 실행: lint-staged → tsc → commitlint

6. **커밋 결과 확인**
   ```bash
   git log --oneline -3
   ```

## 예시 출력
```
분석 완료:
  변경 파일: src/lib/slack.ts, src/app/api/messages/route.ts
  추론 타입: feat (새 API route 추가)
  추론 scope: slack

생성된 커밋 메시지:
  feat(slack): add conversations.history pagination support

  - cursor 기반 페이지네이션으로 1000개 이상 메시지 수집 가능
  - rate limit 대응을 위한 retry 로직 추가

이 메시지로 커밋할까요? (수정하려면 원하는 메시지를 입력하세요)
```
