필수 수정은 아닙니다.

이번 변경은 기존 API와 WebSocket payload를 깨지 않도록 최소 변경으로 넣었기 때문에, 프론트가 기존 방식만 계속 써도 동작합니다.

다만 **최근 알림을 더 빠르게 가져오고 싶다면 프론트에서 선택적으로 수정할 부분이 있습니다.**

**프론트 수정이 필요 없는 부분**

기존 알림 목록 API는 그대로 유지됩니다.

```http
GET /api/facilities/{facilityId}/alert-events
```

기존 WebSocket도 그대로 유지됩니다.

```text
/topic/alerts
```

따라서 현재 프론트가 이 둘을 사용 중이면 바로 깨지는 부분은 없습니다.

**프론트에서 추가로 사용하면 좋은 부분**

새로 추가된 최근 알림 API입니다.

```http
GET /api/facilities/{facilityId}/alert-events/recent
```

이 API는 최근 10분 알림을 조회합니다.

동작 방식:

```text
Redis에 최근 알림 있음 → Redis에서 빠르게 반환
Redis에 없음 → PostgreSQL에서 최근 10분 알림 조회
```

프론트에서는 이런 곳에 쓰면 좋습니다.

- 대시보드 첫 진입 시 최근 알림 복구
- 새로고침 후 최근 10분 알림 다시 표시
- WebSocket 재연결 후 놓친 최근 알림 보정
- 실시간 알림 패널 초기 데이터 로딩

**추천 프론트 흐름**

```text
1. 대시보드 진입
2. GET /api/facilities/{facilityId}/alert-events/recent 호출
3. 최근 10분 알림 목록 표시
4. WebSocket /topic/alerts 구독
5. 이후 들어오는 알림은 WebSocket으로 추가
```

**기존 전체 이력 화면은 그대로**

30일 알림 이력, 검색, 필터, 페이지네이션 화면은 기존 API를 계속 쓰면 됩니다.

```http
GET /api/facilities/{facilityId}/alert-events
```

정리하면:

```text
필수 프론트 수정: 없음
권장 프론트 수정: 대시보드 최근 알림 초기 로딩에 recent API 사용
기존 이력/검색 화면: 기존 API 유지
WebSocket: 기존 /topic/alerts 유지
```