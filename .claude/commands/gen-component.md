# /gen-component — 시각화 컴포넌트 생성

분석 데이터를 시각화하는 React 컴포넌트를 생성합니다.
생성 후 자동으로 `/review`를 실행해 코드 품질을 검증합니다.

## 사용법
```
/gen-component timeline         # 메시지 타임라인 차트
/gen-component sentiment        # 감정 분포 차트
/gen-component heatmap          # 활동 히트맵
/gen-component contributors     # 기여자 순위
/gen-component dashboard        # 전체 대시보드 (위 컴포넌트 조합)
```

## 생성 규칙

### 컴포넌트 기본 구조
- 파일 위치: `src/components/charts/[ComponentName].tsx`
- Props interface 필수 분리
- TailwindCSS만 사용 (외부 CSS 금지)
- Loading / Error / Empty 상태 처리 필수
- 반응형 디자인 (mobile-first)

### 차트 라이브러리
- 설치되어 있는 경우: 기존 라이브러리 활용
- 없는 경우: `recharts` 설치 후 사용 (`pnpm add recharts`)

### 데이터 타입
분석 결과 `data/analysis-*.json`의 구조를 기반으로 Props 타입 정의

## 실행 절차

1. 최신 분석 결과 파일(`data/analysis-*.json`) 확인
2. 요청된 컴포넌트 타입에 맞는 구조 설계
3. 컴포넌트 코드 작성
4. **자동으로 `/review` 실행** → 코드 리뷰
5. Critical 이슈 있으면 즉시 수정 후 재검증
6. `src/app/page.tsx`에 컴포넌트 import 안내
