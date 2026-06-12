import { useEffect, useState } from 'react';
import { fetchActiveCameras, type CameraResponse, type CameraConnectionStatus as BackendCameraConnectionStatus } from '../../../app/api/cameraApi';
import { STREAM_MODE, cameraLoginIdFor, getDynamicStreamUrl, streamRenderKind, type CameraConnectionStatus, type LiveCamera } from '../data/cameras';

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
  const cameraLoginId = cameraLoginIdFor(camera.cameraLoginId, camera.cameraId);
  const url = getDynamicStreamUrl(cameraLoginId);
  console.log(`[CCTV Stream URL] mode=${STREAM_MODE}, cameraLoginId=${cameraLoginId}, cameraId=${camera.cameraId} -> ${url}`);
  return url;
}

function activeCameraToLiveCamera(camera: CameraResponse): LiveCamera {
  return {
    id: cameraLoginIdFor(camera.cameraLoginId, camera.cameraId),
    cameraLoginId: cameraLoginIdFor(camera.cameraLoginId, camera.cameraId),
    cameraDbId: String(camera.cameraId),
    name: camera.cameraName || camera.cameraLoginId || `CCTV-${camera.cameraId}`,
    location: camera.locationDescription || camera.cameraLoginId || '-',
    streamUrl: cameraStreamUrl(camera),
    streamMode: STREAM_MODE,
    streamKind: streamRenderKind(),
    connectionStatus: backendConnectionStatus(camera.connectionStatus),
    eventStatus: 'normal',
  };
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
        if (!cancelled) {
          consecutiveFailures = 0;
          setCameras(activeLiveCameras);
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
