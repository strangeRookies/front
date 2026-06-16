# 프론트엔드 대시보드 개발 가이드 (FRONTEND_GUIDE)

본 문서는 스마트 안전 관제 시스템의 프론트엔드(React 18 / Vite / TS) 개발자를 위한 구조 설명 및 상태 관리 가이드입니다.

---

## 💻 프론트엔드 역할 개요

프론트엔드 대시보드는 현장 작업 구역의 2D 평면도를 보여주며, 백엔드로부터 실시간으로 주입되는 위험 상황 웹소켓 알림(STOMP)을 수신해 시각 및 청각적 경보(오디오 사이렌 반복 재생, 빨간 펄스 라이트 애니메이션)를 울립니다. 관제원이 위험 경보를 확인 및 수용 처리할 수 있도록 직관적인 UI 인터페이스를 매핑하며 HLS/MJPEG 기술을 접목해 실시간 CCTV 라이브 비디오 스트림을 렌더링합니다.

---

## 📂 주요 폴더 구조

```text
strange_front/
├── docs/                    # 프론트엔드 관련 기술 설계서 및 attributions
├── src/
│   ├── assets/              # 이미지, 사운드 등 정적 자원 폴더
│   ├── shared/              # 피처 간 공유 컴포넌트 및 유틸
│   │   └── utils/
│   │       ├── stomp.ts           # 자동 재연결 지원 경량 STOMP 웹소켓 클라이언트
│   │       └── aiEventFeed.ts     # 실시간 이벤트 중복 필터링(Deduplication)
│   ├── features/            # 도메인 주도 피처별 모듈 구성
│   │   └── dashboard/       # 관제 대시보드 핵심 피처 폴더
│   │       ├── api/         # 카메라 및 이벤트 통신 API 클라이언트
│   │       ├── hooks/       # 웹소켓 및 카메라 상태 연동 훅
│   │       ├── pages/       # UserDashboard.tsx 통합 페이지
│   │       └── components/  # 대시보드 화면 전용 React 컴포넌트 목록
│   │           ├── CCTVFloorPlan.tsx      # SVG 평면도 렌더링
│   │           ├── CCTVVideoPlayer.tsx    # CCTV 비디오 재생 쉘
│   │           ├── CameraStreamFrame.tsx  # HLS / MJPEG 비디오 디코더 프레임
│   │           ├── DashboardAlertsView.tsx # 실시간 위험 카드 컴포넌트
│   │           └── LiveCameraGrid.tsx     # CCTV 바둑판식 전체 목록
│   ├── hooks/               # 전역 공통 훅 (useAiEvents.ts)
│   └── App.tsx              # 전역 앱 실행 엔트리
```

---

## 🖥️ 관제 대시보드 화면 구성 요소

### 1. CCTV 카메라 카드 그리드 (`LiveCameraGrid.tsx`)
* 등록된 카메라들을 반응형 그리드 형태로 표현하며 카메라 명칭, 시리얼, ROI 영역 등을 요약 표시합니다.
* 특정 카드가 위험 감지 상태로 전환 시 테두리가 빨간색으로 점멸합니다.

### 2. 2D SVG 평면도 연동 (`CCTVFloorPlan.tsx`)
* CAD 도면 이미지를 대신하여 가벼우면서 반응성이 뛰어난 **React inline SVG** 형식을 사용합니다.
* 평면도 상 각 카메라 기하 좌표에 맞추어 원형 마커 노드를 표현합니다.
* AI로부터 감지가 보고되면, 관련 SVG 노드가 실시간으로 빨갛게 진동하며 깜빡입니다. 노드를 클릭하면 비디오 플레이어 영역에 즉시 해당 카메라 피드가 포커싱되어 열립니다.

### 3. 실시간 HLS 및 MJPEG 듀얼 비디오 재생 (`CameraStreamFrame.tsx`)
* 프론트엔드는 다음 두 가지 출력 모드를 지원합니다:
  1. **HLS 스트림 모드 (`streamKind === 'hls'`)**: MediaMTX의 HLS 중계 서버로부터 미디어를 전달받아 `hls.js` 라이브러리를 통해 저지연 재생을 제어합니다.
  2. **MJPEG Overlay 모드 (`streamKind === 'overlay'`)**: AI 추론 결과(사람 박스, 뼈대 렌더링 등)가 입혀진 AI 실시간 스트림 포트(`8010`~`8013`)를 간단한 `<img>` HTML 태그의 `src` 주소로 연동해 보여줍니다.

### 4. 실시간 위험 경보 피드 및 히스토리 (`DashboardAlertsView.tsx` / `EventLog.tsx`)
* 들어온 알람들은 미확인 경보 피드에 최신순으로 적재됩니다.
* 관제사가 확인 버튼을 누를 때까지 **2초 간격으로 경보 사이렌 음**이 반복 출력되어 경각심을 유도합니다.

---

## 🔌 WebSocket STOMP 연동 메커니즘

외부 라이브러리 충돌을 차단하기 위해 자체적으로 작성된 가볍고 복원성이 검증된 **`SimpleStompClient` (`shared/utils/stomp.ts`)**를 사용합니다.

* **엔드포인트:** `/ws` (웹소켓 프로토콜 주소 자동 변환 적용)
* **메시지 구독 경로:** `/topic/alerts`
* **자동 재연결(Auto-Reconnect):** 소켓 세션이 유실되면 콘솔에 경고를 출력하고 **3초 간격**으로 끊임없이 핸드셰이크를 재시도해 관제 도중 끊김을 자동 극복합니다.
* **중복 필터링 (Deduplication - `aiEventFeed.ts`):** 
  * 동일 객체가 움직이면서 짧은 주기로 수많은 Faint 이벤트를 유발할 때 화면을 폭사시키지 않기 위해 `camera_id` + `event_type` + `track_id` + `bbox`를 이용해 **고유한 fingerprint**를 발급합니다.
  * 15초의 시간 윈도우(`STALE_EVENT_WINDOW_MS`) 내에 동일 fingerprint를 가진 중복 경보는 피드에서 자동으로 병합 및 최신화 처리합니다.

---

## 🚨 시스템 관제 상태 표시 기준

화면에 표시되는 CCTV 및 위험 노드들의 테마 상태입니다:

* **`UNKNOWN`** (회색 테마): 아직 상태 조회가 안 되었거나, 카메라 정보에 분석 소스 URL이 없어 렌더링을 유보하는 대기 노드 상태.
* **`NORMAL`** (초록색/에메랄드 테마): 시스템 정상 가동 중이며 경보가 없는 평온 상태.
* **`DANGER`** (빨간색 경고 테마): 쓰러짐이 감지되어 알람 사운드가 재생되고 있으며, 관제사의 조치/확인이 요구되는 위험 경보 상태.
* **`ERROR`** (노란색/아쿠아 테마): 소켓 차단, MediaMTX 404 차단 등의 오동작 상태.

---

## ⚙️ 프론트엔드 환경변수 설정

Vite 전용 접두사인 `VITE_`를 붙여 프로젝트 루트 `.env`에 정의합니다.
* **`VITE_BACKEND_BASE_URL`**: HTTP API 및 WebSocket 웹소켓 타겟 주소 (기본값: `http://localhost:8080`)
* **`VITE_STREAM_BASE_URL`**: MediaMTX HLS 주소 (기본값: `http://localhost:8888`)

---

## ⚠️ 프론트엔드 수정 시 주의할 점
1. **커스텀 STOMP Client 확장 주의:** STOMP 규약 프레임을 파싱할 때 `\x00` Null 종단 문자를 기점으로 헤더와 본문을 분리하므로, 백엔드 메시지 버퍼 크기나 직렬화 인코딩 세팅이 틀어지지 않았는지 확인하세요.
2. **사운드 자동 재생 브라우저 정책(Autoplay Policy) 주의:** 사용자가 화면을 한 번 이상 터치/클릭하는 Interaction이 발생한 후에야 사운드가 재생될 수 있으므로, 최초 페이지 기동 시 소리 파일 재생 예외가 발생하더라도 대시보드 컴포넌트가 다운되지 않도록 예외 래핑 처리가 들어있습니다.
3. **SVG Node 좌표 매핑 유지:** 도면을 새로 교체할 경우 `CCTVFloorPlan.tsx` 내부의 SVG 뷰박스 크기 대비 카메라 원형 마커들의 하드코딩된 (cx, cy) 좌표값을 새로운 CAD 축척에 맞게 반드시 갱신해야 올바른 위치에 불빛이 들어옵니다.
