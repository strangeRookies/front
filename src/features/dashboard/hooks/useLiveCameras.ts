import { useEffect, useState } from 'react';
import { fetchActiveCameras, type CameraResponse, type CameraConnectionStatus as BackendCameraConnectionStatus } from '../../../app/api/cameraApi';
import { STREAM_BASE_URL, configuredStreamUrl, streamUrl, type CameraConnectionStatus, type LiveCamera } from '../data/cameras';

interface CameraStatusResponse {
  cameras?: Array<{
    id: string;
    name?: string;
    location?: string;
    connected?: boolean;
    streamUrl?: string;
  }>;
}

function toConnectionStatus(connected: boolean | undefined): CameraConnectionStatus {
  if (connected === true) return 'online';
  if (connected === false) return 'offline';
  return 'connecting';
}

function backendConnectionStatus(status: BackendCameraConnectionStatus | undefined): CameraConnectionStatus {
  switch (status) {
    case 'CONNECTED':
      return 'online';
    case 'DISCONNECTED':
    case 'ERROR':
    case 'DISABLED':
      return 'offline';
    case 'RECONNECTING':
    case 'UNKNOWN':
    case undefined:
      return 'connecting';
  }
}

function isFrontendVisibleCamera(camera: CameraResponse): boolean {
  return camera.status === 'ACTIVE'
    && camera.connectionStatus !== 'DISCONNECTED'
    && camera.connectionStatus !== 'ERROR'
    && camera.connectionStatus !== 'DISABLED';
}

function cameraStreamUrl(camera: CameraResponse): string {
  const directStreamUrl = configuredStreamUrl(camera.cameraLoginId)
    ?? configuredStreamUrl(String(camera.cameraId));
  if (directStreamUrl) {
    return directStreamUrl;
  }
  if (camera.displayStreamUrl?.startsWith('http')) {
    return camera.displayStreamUrl;
  }
  return streamUrl(camera.cameraLoginId || String(camera.cameraId));
}

function activeCameraToLiveCamera(camera: CameraResponse): LiveCamera {
  return {
    id: camera.cameraLoginId || String(camera.cameraId),
    cameraLoginId: camera.cameraLoginId,
    cameraDbId: String(camera.cameraId),
    name: camera.cameraName || camera.cameraLoginId || `CCTV-${camera.cameraId}`,
    location: camera.locationDescription || camera.cameraLoginId || '-',
    streamUrl: cameraStreamUrl(camera),
    connectionStatus: backendConnectionStatus(camera.connectionStatus),
    eventStatus: 'normal',
  };
}

function mergeCameraStatus(current: LiveCamera[], payload: CameraStatusResponse): LiveCamera[] {
  const byId = new Map((payload.cameras || []).map(camera => [camera.id, camera]));
  return current.map(camera => {
    const status = byId.get(camera.id);
    if (!status) return camera;
    const directStreamUrl = configuredStreamUrl(status.id);
    return {
      ...camera,
      name: status.name || camera.name,
      location: status.location || camera.location,
      streamUrl: directStreamUrl || (status.streamUrl?.startsWith('http')
        ? status.streamUrl
        : streamUrl(status.id)),
      connectionStatus: toConnectionStatus(status.connected),
    };
  }).filter(camera => camera.connectionStatus !== 'offline');
}

export function useLiveCameras(refreshMs = 5000) {
  const [cameras, setCameras] = useState<LiveCamera[]>([]);

  useEffect(() => {
    let cancelled = false;
    let consecutiveFailures = 0;
    let timer: number | undefined;

    async function refresh() {
      try {
        const activeCameras = await fetchActiveCameras();
        const activeLiveCameras = activeCameras
          .filter(isFrontendVisibleCamera)
          .map(activeCameraToLiveCamera);
        const response = await fetch(`${STREAM_BASE_URL}/cameras`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`camera status ${response.status}`);
        const payload = (await response.json()) as CameraStatusResponse;
        if (!cancelled) {
          consecutiveFailures = 0;
          setCameras(mergeCameraStatus(activeLiveCameras, payload));
        }
      } catch {
        if (!cancelled) {
          consecutiveFailures++;
          try {
            const activeCameras = await fetchActiveCameras();
            setCameras(activeCameras.filter(isFrontendVisibleCamera).map(activeCameraToLiveCamera));
          } catch {
            setCameras([]);
          }
          if (consecutiveFailures === 1) {
            console.warn(`Camera stream service unavailable at ${STREAM_BASE_URL}. Polling stopped after 3 failures.`);
          }
          if (consecutiveFailures >= 3) {
            window.clearInterval(timer);
          }
        }
      }
    }

    refresh();
    timer = window.setInterval(refresh, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshMs]);

  return cameras;
}
