# /pr — PR 생성

현재 브랜치의 커밋 이력과 변경 내용을 분석해 PR을 자동으로 생성합니다.

## 사용법
```
/pr              # 현재 브랜치로 main을 향한 PR 생성
/pr develop      # 베이스 브랜치를 develop으로 지정
```

## 실행 절차

1. **현재 브랜치 및 커밋 확인**
   ```bash
   git branch --show-current
   git log origin/main..HEAD --oneline
   git diff origin/main...HEAD --stat
   ```

2. **PR 메타데이터 수집**
   - 브랜치명 → PR 제목 초안 추출
   - 커밋 목록 분석 → 변경 범위 파악
   - `.claude/reviews/` 에 리뷰 파일 있으면 참조

3. **PR 내용 자동 작성**
   ```markdown
   ## Summary
   - [커밋 기반 주요 변경 내용 2-4줄]

   ## Changes
   - feat: [새 기능]
   - fix: [수정 내용]
   - refactor: [리팩토링 내용]

   ## Test Plan
   - [ ] [영향받는 기능 테스트 항목]
   - [ ] [회귀 테스트 항목]

   ## Related
   - 리뷰: .claude/reviews/[파일명] (있는 경우)
   ```

4. **PR 제목 및 내용 확인**
   - 생성된 내용을 보여주고 수정 여부 확인

5. **PR 생성**
   ```bash
   git push -u origin [현재브랜치]   # push 안 된 경우
   gh pr create --title "..." --body "..."
   ```

6. **결과 출력**
   ```
   ✅ PR 생성 완료
   URL: https://github.com/[owner]/[repo]/pull/[number]

   다음 단계:
   → 팀원 리뷰 요청
   → /review-pr [number] 로 자동 리뷰 실행 가능
   ```

## 사전 요건
- `gh` CLI 인증 필요 (`gh auth status`)
- 원격 저장소(origin) 설정 필요
