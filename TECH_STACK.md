# 스마트 안전 관제 시스템 기술 스택 및 설계 요약 (Tech Stack & Architecture)

본 문서는 스마트 안전 관제 시스템(Smart Safety Monitoring System)에 적용된 전체 기술 스택 구성과 아키텍처 관점에서의 선정 이유(Why)를 설명합니다.

---

## 🛠️ 실시간 데이터 파이프라인 (Real-time Pipeline)

```text
Python Edge AI (이상 행동 감지) 
 ➡️ Redis Pub/Sub (안전 이벤트 수집) 
 ➡️ Spring Boot (메시지 브로커 및 라우팅) 
 ➡️ WebSockets STOMP (클라이언트 방송) 
 ➡️ React Dashboard (실시간 시각화)
```

---

## 1. 프론트엔드 (strange_front)

### 💻 기술 스택
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (아이콘)
- **통신**: WebSockets STOMP (커스텀 경량 클라이언트)
- **도면 렌더링**: inline SVG (Scalable Vector Graphics)

### ❓ 기술 선정 이유 (Why)
* **Vite & TypeScript**: 빠른 개발 사이클을 보장하는 초고속 빌드 도구인 Vite와 정적 타입 검사(TypeScript)를 결합하여 실시간 데이터 모델 구조의 안정성을 확보하고 런타임 오류를 차단하기 위해 사용하였습니다.
* **커스텀 경량 STOMP 클라이언트**: 무거운 외부 라이브러리(STOMP.js 등)를 도입하면 패키지 관리자의 의존성 충돌(Peer Dependency) 문제가 자주 발생합니다. 직접 가볍고 튼튼한 STOMP 파서를 구현함으로써 **의존성 충돌을 완벽히 격리**하고, **3초 간격 자동 재연결(Auto-Reconnect)** 기능을 추가하여 관제 웹소켓의 복원 탄력성을 극대화했습니다.
* **React inline SVG 2D 평면도**: 3D 그래픽(WebGL)이나 무거운 이미지 캔버스(Canvas) 대신 정밀 벡터 그래픽인 SVG를 선택하였습니다. 
  * CAD 아키텍처 도면의 선과 격자 표현이 어떤 해상도에서도 깨지지 않고 선명하게 축소/확대(Responsive scaling)됩니다.
  * 리액트 컴포넌트의 상태(State)와 직접 바인딩하여 위험 노드의 깜빡임 펄스 효과, 선택 하이라이팅을 **가장 성능 저하가 없는 DOM 이벤트**로 트리거할 수 있습니다.

---

## 2. 백엔드 (strange_back)

### 💻 기술 스택
- **Core**: Spring Boot 3.3, Java 21 (Temurin JDK)
- **의존성**: Spring Data Redis, Spring WebSocket
- **빌드 도구**: Gradle 8.7

### ❓ 기술 선정 이유 (Why)
* **Spring Boot 3.3 & Java 21**: 대규모 기업용 트래픽을 감당하는 검증된 백엔드 스택이며, Java 21의 가상 스레드(Virtual Threads) 지원 등으로 멀티스레드 기반의 이벤트 처리에 탁월한 안정성을 띱니다.
* **WebSocket Message Broker (STOMP)**: 단순 Raw WebSocket은 로우레벨 프로토콜이라 메시지 규격이 정해져 있지 않아 클라이언트가 많아지면 메시지 파싱이 파편화됩니다. 
  * 서브 프로토콜인 **STOMP**를 활용하여 헤더(`Headers`), 명령어(`CONNECT`, `SUBSCRIBE`, `MESSAGE`), 목적지(`Destination: /topic/alerts`)가 규격화된 프레임 구조를 구현했습니다. 
  * 백엔드에서 다수의 프론트엔드 관제기로 메시지를 라우팅 및 방송(Broadcasting)하기가 매우 수월해집니다.

---

## 3. 인공지능 시뮬레이터 (strange_ai)

### 💻 기술 스택
- **Core**: Python 3.10+, Redis-py

### ❓ 기술 선정 이유 (Why)
* **Python**: 실무 AI 및 컴퓨터 비전(YOLO, OpenPose 등) 모델 개발의 표준 언어입니다. 
* 실제 엣지(Edge) AI 장비가 낙상/실신 등의 이상 행동을 탐지하여 데이터를 전송하는 파이프라인을 그대로 모사하기 위해 표준 Redis 파이썬 드라이버를 탑재하여 연동 성능을 극대화하였습니다.

---

## 4. 인프라스트럭처 (strange_infra)

### 💻 기술 스택
- **Core**: Docker, Redis 7 (Alpine-based)

### ❓ 기술 선정 이유 (Why)
* **Redis Pub/Sub (Publish/Subscribe)**: 복잡한 메시지 큐(RabbitMQ, Kafka 등)보다 구조가 극도로 단순하며 **인메모리(In-Memory)** 상에서 초당 수만 건의 데이터 메시지를 밀리초(ms) 단위로 전달할 수 있습니다.
* 데이터베이스(RDBMS)에 직접 접근하기 전, 엣지 AI의 급격한 경보 신호 전송을 중계하고 캐싱하는 인메모리 버퍼 역할을 하기에 최적이라 선정되었습니다.
* **Docker Compose**: 개발/운영 환경 차이에 영향받지 않고 일관된 환경에서 가볍게 Redis 서비스를 구동 및 중단하기에 유용합니다.
