export type CameraConnectionStatus = 'online' | 'offline' | 'connecting';
export type CameraEventStatus = 'normal' | 'warning' | 'danger';

export interface LiveCamera {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  connectionStatus: CameraConnectionStatus;
  eventStatus: CameraEventStatus;
  eventLabel?: string;
}

const env = import.meta.env;

export const STREAM_BASE_URL = (env.VITE_STREAM_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const CAMERA_STREAM_URLS: Record<string, string | undefined> = {
  'camera-1': env.VITE_CAMERA_1_STREAM_URL,
  'camera-2': env.VITE_CAMERA_2_STREAM_URL,
  'camera-3': env.VITE_CAMERA_3_STREAM_URL,
  'camera-4': env.VITE_CAMERA_4_STREAM_URL,
};

export const configuredStreamUrl = (cameraId: string) => {
  const directUrl = CAMERA_STREAM_URLS[cameraId];
  if (directUrl && directUrl.trim().length > 0) {
    return directUrl.trim();
  }
  return undefined;
};

export const streamUrl = (cameraId: string) => {
  const directUrl = configuredStreamUrl(cameraId);
  if (directUrl) return directUrl;
  return `${STREAM_BASE_URL}/stream/${cameraId}`;
};

export const LIVE_CAMERAS: LiveCamera[] = [
  {
    id: 'camera-1',
    name: 'CCTV-01',
    location: '1층 병실 1',
    streamUrl: streamUrl('camera-1'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'camera-2',
    name: 'CCTV-02',
    location: '1층 복도 A',
    streamUrl: streamUrl('camera-2'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'camera-3',
    name: 'CCTV-03',
    location: '원격 카메라 1',
    streamUrl: streamUrl('camera-3'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'camera-4',
    name: 'CCTV-04',
    location: '원격 카메라 2',
    streamUrl: streamUrl('camera-4'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
];

export function getCameraByName(name: string) {
  return LIVE_CAMERAS.find(camera => camera.name === name);
}
