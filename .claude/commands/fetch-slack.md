# /fetch-slack — Slack 채널 메시지 수집

지정한 Slack 채널의 메시지를 수집해 `data/` 폴더에 JSON으로 저장합니다.

## 사용법
```
/fetch-slack general          # #general 채널, 기본 30일
/fetch-slack general 7        # #general 채널, 최근 7일
/fetch-slack dev-team 14      # #dev-team 채널, 최근 14일
```

## 실행 절차

1. **환경 확인**
   - `SLACK_BOT_TOKEN` 환경변수 설정 여부 확인
   - 미설정 시 설정 방법 안내 후 중단

2. **data-validator 에이전트로 기존 데이터 확인**
   - `data/` 폴더에 동일 채널의 최근 데이터가 있으면 알림
   - 덮어쓸지 증분 수집할지 확인

3. **Slack API 호출 (conversations.history)**
   - 채널: $ARGUMENTS[0] (기본값: general)
   - 기간: 최근 $ARGUMENTS[1]일 (기본값: 30)
   - 페이지네이션 처리 (cursor 기반)
   - 사용자 정보 enrichment (users.info)

4. **데이터 저장**
   - 경로: `data/slack-[채널명]-[YYYYMMDD].json`
   - 형식:
     ```json
     {
       "metadata": { "channel", "fetchedAt", "period", "messageCount" },
       "messages": [{ "ts", "userId", "userName", "text", "reactions", "replyCount" }]
     }
     ```

5. **수집 완료 요약**
   ```
   수집 완료: #general (최근 30일)
   총 메시지: 1,234건
   참여자: 42명
   저장 위치: data/slack-general-20260225.json
   ```
