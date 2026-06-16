import { useEffect, useRef, useState } from 'react';
import { SimpleStompClient } from '../../../shared/utils/stomp';
import { logger } from '../../../shared/utils/logger';

// 23.md Section 6 "카메라 상태 값 정의" 에 대응하는 실시간 연결 상태
export type CameraConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISABLED' | 'UNKNOWN';

export interface CameraStatusEvent {
  messageType: string;
  cameraId?: string;
  cameraLoginId?: string;
  edgeDeviceId?: string;
  /** CONNECTED | DISCONNECTED | RECONNECTING | ERROR | DISABLED */
  status: CameraConnectionStatus;
  previousStatus?: CameraConnectionStatus;
  reason?: string;
  rtspUrlMasked?: string;
  detectedAt?: string;
}

/** cameraLoginId → 최신 연결 상태 맵 */
export type CameraStatusMap = Map<string, CameraStatusEvent>;

function parseCameraStatusEvent(raw: Record<string, unknown>): CameraStatusEvent | null {
  const messageType = (raw.messageType ?? raw.message_type ?? 'CAMERA_STATUS') as string;
  const cameraLoginId = (raw.cameraLoginId ?? raw.camera_login_id) as string | undefined;
  const cameraId = (raw.cameraId ?? raw.camera_id) as string | undefined;
  const status = ((raw.status as string) ?? 'UNKNOWN').toUpperCase() as CameraConnectionStatus;

  if (!cameraLoginId && !cameraId) {
    logger.warn('[useCameraStatusWebSocket] Camera status event missing cameraLoginId/cameraId.');
    return null;
  }

  return {
    messageType,
    cameraId,
    cameraLoginId,
    edgeDeviceId: (raw.edgeDeviceId ?? raw.edge_device_id) as string | undefined,
    status,
    previousStatus: (raw.previousStatus ?? raw.previous_status) as CameraConnectionStatus | undefined,
    reason: raw.reason as string | undefined,
    rtspUrlMasked: (raw.rtspUrlMasked ?? raw.rtsp_url_masked) as string | undefined,
    detectedAt: (raw.detectedAt ?? raw.detected_at) as string | undefined,
  };
}

/**
 * WebSocket /topic/camera-status 구독 훅.
 * Backend가 MQTT safety/cameras/status 를 수신 → WebSocket 브로드캐스트한 이벤트를 수신한다.
 *
 * 반환: cameraLoginId → CameraStatusEvent 맵
 */
export function useCameraStatusWebSocket(): CameraStatusMap {
  const [statusMap, setStatusMap] = useState<CameraStatusMap>(new Map());
  const backendBaseUrl = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
  const wsUrl = backendBaseUrl.replace(/^http/, 'ws') + '/ws';

  // We keep a ref so the closure in the STOMP client doesn't capture stale state
  const statusMapRef = useRef<CameraStatusMap>(statusMap);
  statusMapRef.current = statusMap;

  useEffect(() => {
    const client = new SimpleStompClient({
      url: wsUrl,
      topic: '/topic/camera-status',
      onMessage: (raw: Record<string, unknown>) => {
        const event = parseCameraStatusEvent(raw);
        if (!event) return;
        const key = event.cameraLoginId ?? event.cameraId ?? '';
        if (!key) return;

        setStatusMap((prev) => {
          const next = new Map(prev);
          next.set(key, event);
          return next;
        });
      },
      onStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => {
        logger.info(`[useCameraStatusWebSocket] STOMP status: ${status}`);
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  return statusMap;
}

/**
 * LiveCamera.connectionStatus (old) 와 CameraConnectionStatus (new) 를 매핑한다.
 * '온라인/오프라인' 3단계 대신 5단계 실시간 상태로 확장된 표현이 가능하다.
 */
export function toCameraConnectionStatusDisplay(status: CameraConnectionStatus): {
  dot: string;
  label: string;
  badge: string;
  border: string;
} {
  switch (status) {
    case 'CONNECTED':
      return {
        dot: 'bg-emerald-400 animate-pulse',
        label: '실시간 모니터링 중',
        badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
        border: 'border-emerald-500/30',
      };
    case 'DISCONNECTED':
      return {
        dot: 'bg-red-500',
        label: '카메라 연결 끊김',
        badge: 'bg-red-500/15 text-red-300 border-red-500/30',
        border: 'border-red-500/60',
      };
    case 'RECONNECTING':
      return {
        dot: 'bg-amber-400 animate-pulse',
        label: '재연결 시도 중',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        border: 'border-amber-500/60',
      };
    case 'ERROR':
      return {
        dot: 'bg-red-600',
        label: '카메라 오류',
        badge: 'bg-red-700/20 text-red-200 border-red-600/40',
        border: 'border-red-600/80',
      };
    case 'DISABLED':
      return {
        dot: 'bg-slate-500',
        label: '비활성 카메라',
        badge: 'bg-slate-700/30 text-slate-400 border-slate-600/25',
        border: 'border-slate-700',
      };
    default:
      return {
        dot: 'bg-slate-400 animate-pulse',
        label: '상태 확인 중',
        badge: 'bg-slate-700/20 text-slate-300 border-slate-700/30',
        border: 'border-slate-800',
      };
  }
}
