# MQTT Overlay 전용 백엔드·프론트 개발 계획

## Summary
이번 범위는 MQTT alert 알림이 아니라 **실시간 CCTV 오버레이 표시만**이다. AI가 `camera` topic으로 발행하는 `messageType=overlay` JSON을 백엔드가 받아 프론트로 전달하고, 프론트는 해당 카메라 영상 위에 bbox/위험 라벨을 표시한다.

```text
AI worker
  -> MQTT topic: camera
  -> Backend overlay subscriber
  -> STOMP/WebSocket overlay topic
  -> Frontend CCTV 카드 overlay layer
```

`/safety/events`, 경고음, 오른쪽 “실시간 AI 이벤트” 패널, 미확인 이벤트 카운트는 이번 범위에서 제외한다.

## Overlay Payload 기준
AI overlay payload는 아래 형식을 기준으로 처리한다.

```json
{
  "schemaVersion": "1.0",
  "messageType": "overlay",
  "timestampMs": 1782180000123,
  "streamId": "cam_01",
  "cameraLoginId": "cam_01",
  "frameWidth": 640,
  "frameHeight": 360,
  "events": [
    {
      "type": "faint",
      "confidence": 0.72,
      "trackingId": 3,
      "bbox": {
        "x": 120,
        "y": 80,
        "width": 200,
        "height": 150
      },
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 200,
        "height": 150
      },
      "keypoints": []
    }
  ]
}
```

처리 기준:
- `messageType === "overlay"`만 overlay로 처리한다.
- 카메라 매칭 키는 `cameraLoginId` 우선, 없으면 `streamId`를 사용한다.
- `frameWidth/frameHeight`는 AI 원본 좌표계다.
- `events`가 빈 배열이면 해당 카메라 overlay를 제거하거나 표시하지 않는다.
- `bbox`와 `boundingBox`가 모두 있으면 `bbox`를 기본으로 사용한다.
- `type`은 `faint`, `fall` 등 소문자로 올 수 있으므로 프론트에서 표시명으로 변환한다.

## Backend 계획
- MQTT `camera` topic 구독을 overlay 전용으로 처리한다.
- 수신한 overlay payload를 DB alert/incident로 저장하지 않는다.
- payload validation은 최소 필드 기준으로 수행한다.
  - 필수: `messageType`, `cameraLoginId` 또는 `streamId`, `frameWidth`, `frameHeight`, `events`
- 백엔드는 카메라 식별자를 DB의 `cameraLoginId`와 매칭한다.
- 매칭 성공 시 시설/회사 기준 STOMP topic으로 overlay를 broadcast한다.
  - 권장 topic: `/topic/facility/{facilityId}/camera-overlays`
  - 필요 시 회사 단위: `/topic/company/{companyProfileId}/camera-overlays`
- broadcast payload는 AI 원본 구조를 최대한 유지하되, 프론트 매칭용 `cameraLoginId`는 반드시 포함한다.
- 로그는 alert 로그와 분리한다.
  - `MQTT overlay received topic=camera cameraLoginId=cam_01 events=1`
  - `Overlay camera matched cameraLoginId=cam_01 facilityId=...`
  - `Overlay STOMP published destination=...`

## Frontend 계획
- CCTV 화면에서 overlay 전용 STOMP topic을 구독한다.
- 수신 payload의 `cameraLoginId` 또는 `streamId`가 카드의 카메라 ID와 일치할 때만 해당 카드에 적용한다.
- 영상 위에 absolute overlay layer를 둔다.
- 좌표 변환:
  - `scaleX = displayedVideoWidth / frameWidth`
  - `scaleY = displayedVideoHeight / frameHeight`
  - `left = bbox.x * scaleX`
  - `top = bbox.y * scaleY`
  - `width = bbox.width * scaleX`
  - `height = bbox.height * scaleY`
- `events[].type` 표시명:
  - `fall` -> `FALL_DETECTED (낙상) 감지`
  - `faint` -> `FAINT (쓰러짐) 감지`
  - 그 외 값은 대문자 변환 후 표시
- overlay TTL을 둔다.
  - 권장 기본값: 마지막 수신 후 2초 동안만 표시
  - 새 overlay가 오면 TTL 갱신
  - `events=[]`가 오면 즉시 제거
- overlay 수신만으로 오른쪽 이벤트 패널 추가, 경고음, 미확인 이벤트 카운트 증가는 하지 않는다.

## Test Plan
- MQTT 직접 확인:
  - `mosquitto_sub -h 15.165.248.37 -p 1883 -t camera -v`
  - `messageType=overlay` payload가 계속 들어오는지 확인
- 백엔드 테스트:
  - `camera` topic payload 수신 시 overlay STOMP publish 확인
  - `events=[]` payload 수신 시 프론트에 빈 overlay 전달 또는 제거 이벤트 전달 확인
  - `cameraLoginId` 불일치 시 warning 로그 확인
  - overlay 수신 시 alert/incident DB 저장이 발생하지 않는지 확인
- 프론트 테스트:
  - `cam_01` overlay가 `cam_01` 카드에만 표시되는지 확인
  - bbox가 영상 크기 변경, 전체화면, 반응형 레이아웃에서도 정확히 scale 되는지 확인
  - `events=[]` 또는 TTL 만료 시 overlay가 사라지는지 확인
  - overlay 수신만으로 경고음/이벤트 패널/미확인 카운트가 동작하지 않는지 확인

## Assumptions
- 이번 개발 범위는 overlay 표시 전용이다.
- AI overlay topic은 `camera`다.
- 백엔드/프론트 카메라 매칭 기준은 DB `cameraLoginId`다.
- alert 이벤트 topic인 `safety/events`는 이번 범위에서 다루지 않는다.
- 프론트는 WebRTC/HLS 영상과 overlay metadata를 분리해서 처리한다.
