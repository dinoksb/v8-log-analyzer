# /review-pr — PR 자동 리뷰 및 수정 (Mode A)

PR을 리뷰하고 이슈가 있으면 자동으로 수정·푸시합니다.
**머지는 사용자 확인 후에만 진행합니다.**

## 사용법
```
/review-pr 42              # PR #42 리뷰
/review-pr 42 --review-only  # 수정 없이 리뷰만
```

## 실행 절차

1. **사전 확인**
   - `gh` CLI 인증 상태 확인
   - PR 번호 유효성 확인 (`gh pr view $PR_NUMBER`)

2. **pr-reviewer 에이전트 실행**
   - Phase 1: PR diff 수집
   - Phase 2: 코드 리뷰 (code-reviewer 기준 적용)
   - Phase 3: 이슈 발견 시 자동 수정 + 푸시 (`--review-only` 아닌 경우)
   - Phase 4: CI 상태 확인
   - Phase 5: 리뷰 요약 + 머지 방식 선택 요청

3. **사용자 머지 승인**
   - 요약을 보고 머지 방식 선택
   - Phase 6: 선택된 방식으로 머지 실행

## 주의사항
- `gh` CLI가 설치되어 있고 인증되어 있어야 합니다 (`gh auth status`)
- PR 브랜치에 직접 수정사항을 푸시하므로 저장소 쓰기 권한이 필요합니다
- 브랜치 보호 규칙(필수 리뷰어, CI 통과 등)이 있으면 머지가 제한될 수 있습니다
