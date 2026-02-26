# /refactor — 리뷰 기반 리팩토링 실행

가장 최근 `/review` 결과를 읽고, 발견된 이슈를 우선순위에 따라 실제 코드에 적용합니다.

## 사용법
```
/refactor                              # 최신 리뷰 결과 기반 리팩토링
/refactor src/components/Foo.tsx       # 특정 파일만 리팩토링
/refactor critical                     # Critical 이슈만 수정
/refactor all                          # Critical + Warning 전부 수정
```

## 실행 절차

1. **리뷰 결과 로드**
   - `.claude/reviews/` 에서 가장 최근 리뷰 파일 확인
   - $ARGUMENTS로 특정 파일이 지정된 경우 해당 파일의 리뷰만 로드

2. **이슈 분류 및 적용 범위 결정**
   - 기본값: 🔴 Critical 이슈만 자동 수정
   - `all` 옵션: 🔴 Critical + 🟡 Warning 모두 수정
   - 🔵 Suggestion은 목록만 제시하고 사용자가 선택

3. **리팩토링 실행**
   - 각 이슈에 대해 수정 전/후 코드를 보여주고 적용
   - 여러 파일에 걸친 변경이 필요한 경우 일괄 처리

4. **리팩토링 후 검증**
   - 수정된 파일에 대해 자동으로 lint 재실행
   - 타입 오류가 없는지 확인

5. **리팩토링 요약 출력**
   ```
   [리팩토링 완료]
   수정된 파일: N개
   해결된 이슈: Critical N건, Warning N건
   잔여 이슈 (Suggestion): N건
   ```

## 주의사항
- 리팩토링은 기존 동작을 변경하지 않는 범위에서만 수행
- 로직 변경이 필요한 경우 반드시 사용자 확인 후 진행
- 리뷰 결과 없이 실행 시 먼저 `/review`를 실행하도록 안내
