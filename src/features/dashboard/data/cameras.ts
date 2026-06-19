export type CameraConnectionStatus = 'online' | 'offline' | 'connecting';
export type CameraEventStatus = 'normal' | 'warning' | 'danger';
export type StreamMode = 'raw' | 'overlay' | 'webrtc';
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
      : 'overlay';

export const WEBRTC_BASE_URL = (env.VITE_WEBRTC_BASE_URL || 'http://localhost:8889').replace(/\/$/, '');
export const HLS_BASE_URL = (env.VITE_HLS_BASE_URL || env.VITE_STREAM_BASE_URL || 'http://localhost:8888').replace(/\/$/, '');
export const OVERLAY_BASE_URL = (env.VITE_OVERLAY_BASE_URL || 'http://localhost:8010').replace(/\/$/, '');
export const STREAM_FALLBACK_ENABLED: boolean = env.VITE_STREAM_FALLBACK_ENABLED !== 'false';

function cameraNumber(cameraLoginId: string): number {
  const match = cameraLoginId.match(/(\d+)$/);
  if (!match) return 1;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

function overlayUrl(cameraLoginId: string): string {
  try {
    const url = new URL(OVERLAY_BASE_URL);
    const basePort = Number.parseInt(url.port || '8010', 10);
    if (Number.isFinite(basePort)) {
      url.port = String(basePort + cameraNumber(cameraLoginId) - 1);
    }
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return OVERLAY_BASE_URL;
  }
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
  return overlayUrl(cameraLoginId);
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
