# /review — 코드 리뷰 실행

최근 작성하거나 수정한 파일에 대해 code-reviewer 에이전트를 사용해 코드 리뷰를 실행합니다.

## 사용법
```
/review                    # 가장 최근 수정된 파일 리뷰
/review src/components/Foo.tsx   # 특정 파일 리뷰
/review src/components/          # 디렉토리 내 전체 리뷰
```

## 실행 절차

1. **대상 파일 확인**
   - $ARGUMENTS가 있으면 해당 파일/디렉토리 대상
   - 없으면 가장 최근에 Write/Edit된 TypeScript 파일 자동 감지

2. **code-reviewer 에이전트 호출**
   - 대상 파일을 code-reviewer 에이전트에게 전달해 리뷰 수행

3. **리뷰 결과 저장**
   - `.claude/reviews/[YYYYMMDD-HHMMSS]-[filename].md` 에 저장

4. **등급 판정 및 다음 액션 안내**
   - 등급 A/B → "리뷰 통과. 필요 시 /refactor로 선택적 개선 가능"
   - 등급 C/D → "수정 필요. /refactor를 실행해 자동 리팩토링을 적용하세요"

## 주의사항
- 리뷰는 현재 파일 상태를 기준으로 하며, 빌드 실행은 포함되지 않음
- TypeScript/TSX 파일만 리뷰 대상 (CSS, JSON 등 제외)
