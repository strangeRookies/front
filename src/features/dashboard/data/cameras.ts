export type CameraConnectionStatus = 'online' | 'offline' | 'connecting';
export type CameraEventStatus = 'normal' | 'warning' | 'danger';
export type StreamMode = 'raw' | 'overlay' | 'webrtc' | 'mjpeg';
export type StreamRenderKind = 'hls' | 'mjpeg';

export interface LiveCamera {
  id: string;
  cameraLoginId?: string;
  cameraDbId?: string;
  name: string;
  location: string;
  streamUrl: string;
  streamMode: StreamMode;
  streamKind: StreamRenderKind;
  connectionStatus: CameraConnectionStatus;
  eventStatus: CameraEventStatus;
  eventLabel?: string;
}

const env = import.meta.env;
const streamModeEnv = env.VITE_STREAM_MODE as string | undefined;

export const STREAM_MODE: StreamMode =
  streamModeEnv === 'webrtc'
    ? 'webrtc'
    : streamModeEnv === 'raw'
      ? 'raw'
      : streamModeEnv === 'mjpeg'
        ? 'mjpeg'
        : 'overlay';

export const WEBRTC_BASE_URL = (env.VITE_WEBRTC_BASE_URL || 'http://localhost:8889').replace(/\/$/, '');
export const HLS_BASE_URL = (env.VITE_HLS_BASE_URL || env.VITE_STREAM_BASE_URL || 'http://localhost:8888').replace(/\/$/, '');
export const MJPEG_BASE_URL = (env.VITE_MJPEG_BASE_URL || env.VITE_OVERLAY_BASE_URL || 'http://localhost:8010').replace(/\/$/, '');
export const STREAM_FALLBACK_ENABLED: boolean = env.VITE_STREAM_FALLBACK_ENABLED !== 'false';

/**
 * MJPEG BASE_PORT + offset 스타일로 각 카메라 AI worker를 별도 포트에서 서비스한다.
 * cam_01 -> BASE_PORT+0, cam_02 -> BASE_PORT+1, cam_03 -> BASE_PORT+2 ...
 *
 * 기본적으로 serve_ai_overlay.py는 카메라별 독립된 HTTP 서버를 다른 포트에서 망는다.
 * VITE_MJPEG_BASE_URL이 http://host:8010 이면 cam_01 -> http://host:8010, cam_02 -> http://host:8011 ...
 * 비주얼용 수비 없는 리버스 프록시(nginx 등)가 있는 경우 VITE_MJPEG_PROXY_MODE=true로
 * 단일 포트 + 싱글 URL 데이승 방식으로 전환 가능.
 */
const MJPEG_PROXY_MODE: boolean = env.VITE_MJPEG_PROXY_MODE === 'true';

export function getMjpegUrlForCamera(cameraLoginId: string): string {
  // nginx 등 reverse proxy 모드: 단일 URL + cameraLoginId 경로
  if (MJPEG_PROXY_MODE) {
    return `${MJPEG_BASE_URL}/mjpeg/${cameraLoginId}`;
  }
  // 직접 모드: 카메라 번호로 포트 offset 계산
  // cam_01 -> +0, cam_02 -> +1, cam_03 -> +2 ...
  const parsed = new URL(MJPEG_BASE_URL);
  const basePort = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), 10);
  const numMatch = cameraLoginId.match(/(\d+)$/);
  const camNum = numMatch ? parseInt(numMatch[1], 10) : 1;
  const portOffset = Math.max(0, camNum - 1);
  const targetPort = basePort + portOffset;
  return `${parsed.protocol}//${parsed.hostname}:${targetPort}/mjpeg/${cameraLoginId}`;
}

export function cameraLoginIdFor(cameraLoginId: string | undefined, cameraId: number | string): string {
  if (cameraLoginId && cameraLoginId.trim().length > 0) {
    return cameraLoginId.trim();
  }
  const rawId = String(cameraId).trim();
  if (rawId.startsWith('cam_')) {
    return rawId;
  }
  const numericId = Number.parseInt(rawId, 10);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `cam_${String(numericId).padStart(2, '0')}`;
  }
  return rawId;
}

export function streamRenderKind(): StreamRenderKind {
  return (STREAM_MODE === 'raw' || STREAM_MODE === 'webrtc') ? 'hls' : 'mjpeg';
}

export const getDynamicStreamUrl = (cameraLoginId: string): string => {
  if (STREAM_MODE === 'webrtc') {
    return `${WEBRTC_BASE_URL}/${cameraLoginId}/whep`;
  }
  if (STREAM_MODE === 'raw') {
    return `${HLS_BASE_URL}/${cameraLoginId}/index.m3u8`;
  }
  if (STREAM_MODE === 'mjpeg') {
    return getMjpegUrlForCamera(cameraLoginId);
  }
  return '';
};

export const streamUrl = (cameraId: string) => {
  return getDynamicStreamUrl(cameraId);
};

export const LIVE_CAMERAS: LiveCamera[] = [
  {
    id: 'cam_01',
    cameraLoginId: 'cam_01',
    name: 'CCTV-01',
    location: 'Camera 1',
    streamUrl: streamUrl('cam_01'),
    streamMode: STREAM_MODE,
    streamKind: streamRenderKind(),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'cam_02',
    cameraLoginId: 'cam_02',
    name: 'CCTV-02',
    location: 'Camera 2',
    streamUrl: streamUrl('cam_02'),
    streamMode: STREAM_MODE,
    streamKind: streamRenderKind(),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'cam_03',
    cameraLoginId: 'cam_03',
    name: 'CCTV-03',
    location: 'Camera 3',
    streamUrl: streamUrl('cam_03'),
    streamMode: STREAM_MODE,
    streamKind: streamRenderKind(),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'cam_04',
    cameraLoginId: 'cam_04',
    name: 'CCTV-04',
    location: 'Camera 4',
    streamUrl: streamUrl('cam_04'),
    streamMode: STREAM_MODE,
    streamKind: streamRenderKind(),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
];

export function getCameraByName(name: string) {
  return LIVE_CAMERAS.find(camera => camera.name === name);
}
