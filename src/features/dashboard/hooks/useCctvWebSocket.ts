import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useCctvStore } from '../../../store/useCctvStore';

/**
 * 백엔드 STOMP 서버와 실시간으로 데이터를 주고받는 커스텀 훅입니다.
 * 브라우저 환경 호환성을 위해 SockJS를 사용합니다.
 */
export function useCctvWebSocket() {
  const setTelemetryData = useCctvStore((state) => state.setTelemetryData);

  useEffect(() => {
    // 1. SockJS 인스턴스 생성
    const socket = new SockJS('http://localhost:8080/ws-stomp');

    // 2. STOMP Client 설정
    const stompClient = new Client({
      // 브라우저 환경에서 net 모듈 에러를 방지하기 위해 webSocketFactory 사용
      webSocketFactory: () => socket as any,
      
      onConnect: () => {
        console.log('✅ STOMP 연결 성공!');

        // 3. 실시간 좌표 데이터 구독 (/topic/cctv/telemetry)
        stompClient.subscribe('/topic/cctv/telemetry', (message) => {
          try {
            const realData = JSON.parse(message.body);
            setTelemetryData(realData);
          } catch (e) {
            console.error('좌표 데이터 파싱 오류:', e);
          }
        });

        // 4. 위험 이벤트 알림 구독 (/topic/cctv/event)
        stompClient.subscribe('/topic/cctv/event', (message) => {
          try {
            const alertData = JSON.parse(message.body);
            console.log('🚨 위험 이벤트 수신:', alertData);
          } catch (e) {
            console.error('이벤트 알림 파싱 오류:', e);
          }
        });
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP 에러:', frame.headers['message']);
      },
      
      // 연결 유지를 위한 하트비트 설정
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      debug: (str) => console.log('STOMP 디버그:', str),
    });

    // 연결 활성화
    stompClient.activate();

    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      stompClient.deactivate();
    };
  }, [setTelemetryData]);
}