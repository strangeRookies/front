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

export const STREAM_BASE_URL = ((import.meta as any).env?.VITE_STREAM_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export const streamUrl = (cameraId: string) => `${STREAM_BASE_URL}/stream/${cameraId}`;

export const LIVE_CAMERAS: LiveCamera[] = [
  {
    id: 'camera-1',
    name: 'CCTV-01',
    location: '1F Room 1',
    streamUrl: streamUrl('camera-1'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'camera-2',
    name: 'CCTV-02',
    location: '1F Corridor A',
    streamUrl: streamUrl('camera-2'),
    connectionStatus: 'online',
    eventStatus: 'danger',
    eventLabel: 'FALL',
  },
  {
    id: 'camera-3',
    name: 'CCTV-03',
    location: 'Remote Webcam 1',
    streamUrl: streamUrl('camera-3'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
  {
    id: 'camera-4',
    name: 'CCTV-04',
    location: 'Remote Webcam 2',
    streamUrl: streamUrl('camera-4'),
    connectionStatus: 'online',
    eventStatus: 'normal',
  },
];

export function getCameraByName(name: string) {
  return LIVE_CAMERAS.find(camera => camera.name === name);
}
