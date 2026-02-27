# /commit — 스마트 Conventional Commit (자동 모드)

git diff를 분석해 Conventional Commit 메시지를 자동 생성하고 **확인 없이 즉시 커밋 + 푸시**합니다.
husky pre-commit(lint-staged + tsc)과 commit-msg(commitlint)가 자동 실행됩니다.

## 사용법
```
/commit              # 전체 변경사항 자동 분석 → 커밋 → 푸시
/commit staged       # 이미 스테이징된 파일만 커밋 → 푸시
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

4. **커밋 메시지 작성 후 즉시 커밋 (확인 없음)**
   ```
   형식: <type>(<scope>): <subject>

   [body: 변경 이유 및 주요 내용 - 선택]
   ```
   - subject: 72자 이내, 소문자, 명령형
   - 최근 리뷰 결과(`.claude/reviews/`)가 있으면 참조해 메시지 품질 향상
   - 생성된 메시지를 사용자에게 표시하고 **즉시 커밋 실행** (별도 확인 없음)

   ```bash
   git add -A        # staged 아닌 경우
   git commit -m "..."
   ```
   - husky가 자동 실행: lint-staged → tsc → commitlint

5. **커밋 성공 후 즉시 푸시**
   ```bash
   git push origin <현재브랜치>
   ```

6. **결과 확인**
   ```bash
   git log --oneline -3
   ```

## 예시 출력
```
[커밋 메시지] fix(api): parse date range in KST instead of UTC
→ 커밋 중...
→ 푸시 중...
✓ 완료: main ← fix(api): parse date range in KST instead of UTC
```
