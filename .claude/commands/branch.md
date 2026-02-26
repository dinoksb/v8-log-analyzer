# /branch — 기능 브랜치 생성

컨벤션에 맞는 브랜치를 생성하고 upstream을 설정합니다.

## 사용법
```
/branch feat slack-api-integration
/branch fix chart-tooltip-overflow
/branch refactor analysis-sentiment
/branch chore update-dependencies
```

## 브랜치 네이밍 규칙
```
[type]/[kebab-case-description]

예시:
  feat/slack-api-integration
  fix/chart-tooltip-overflow
  refactor/analysis-sentiment-extractor
  chore/update-pnpm-dependencies
```

## 실행 절차

1. **인자 파싱**
   - $ARGUMENTS[0]: type (feat/fix/refactor/style/docs/test/chore/perf)
   - $ARGUMENTS[1..]: description → kebab-case로 변환

2. **현재 브랜치 확인**
   - main/master에서 분기하는지 확인
   - 이미 같은 이름의 브랜치가 있으면 알림

3. **브랜치 생성**
   ```bash
   git checkout -b [type]/[description]
   ```

4. **결과 확인**
   ```
   ✅ 브랜치 생성 완료
   브랜치: feat/slack-api-integration
   기준: main (최신 상태)

   다음 단계:
   → 코드 작성 후 /commit으로 커밋
   → PR 준비되면 /pr로 생성
   ```

## 허용 타입
`feat` `fix` `refactor` `style` `docs` `test` `chore` `perf`
