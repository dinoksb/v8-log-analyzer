# /analyze — 수집 데이터 분석

`data/` 폴더의 Slack 수집 데이터를 분석해 인사이트를 추출합니다.

## 사용법
```
/analyze                              # 가장 최근 데이터 분석
/analyze data/slack-general-*.json   # 특정 파일 분석
/analyze general sentiment            # 특정 채널 + 분석 유형 지정
```

## 분석 유형
- **sentiment**: 긍정/부정/중립 감정 분류
- **topics**: 주요 주제 및 키워드 클러스터링
- **activity**: 시간대별·요일별 활동 패턴
- **users**: 기여자 순위 및 참여도
- **default**: 위 4가지 전체 실행

## 실행 절차

1. **data-validator 에이전트로 데이터 검증**
   - JSON 구조 유효성, 필드 완결성 확인

2. **trend-analyzer 에이전트로 분석 실행**
   - 감정 분석, 토픽 추출, 활동 패턴 분석 병렬 실행

3. **분석 결과 저장**
   - `data/analysis-[채널명]-[YYYYMMDD].json`

4. **요약 리포트 출력**

## 분석 결과 형식
```json
{
  "metadata": { "analyzedAt", "channel", "messageCount" },
  "sentiment": { "positive": 60, "neutral": 25, "negative": 15 },
  "topTopics": [{ "keyword", "count", "trend" }],
  "activityHeatmap": { "byHour": [...], "byDayOfWeek": [...] },
  "topContributors": [{ "userId", "userName", "messageCount" }]
}
```
