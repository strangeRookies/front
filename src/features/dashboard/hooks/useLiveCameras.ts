import { useEffect, useState } from 'react';
import { fetchActiveCameras, type CameraResponse, type CameraConnectionStatus as BackendCameraConnectionStatus } from '../../../app/api/cameraApi';
import { STREAM_MODE, cameraLoginIdFor, resolveCameraStream, type CameraConnectionStatus, type LiveCamera } from '../data/cameras';

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

function activeCameraToLiveCamera(camera: CameraResponse): LiveCamera {
  const cameraLoginId = cameraLoginIdFor(camera.cameraLoginId, camera.cameraId);
  const resolvedStream = resolveCameraStream(cameraLoginId, camera);
  return {
    id: cameraLoginId,
    cameraLoginId,
    cameraDbId: String(camera.cameraId),
    name: camera.cameraName || camera.cameraLoginId || `CCTV-${camera.cameraId}`,
    location: camera.locationDescription || camera.cameraLoginId || '-',
    streamUrl: resolvedStream.streamUrl,
    streamMode: STREAM_MODE,
    streamKind: resolvedStream.streamKind,
    connectionStatus: backendConnectionStatus(camera.connectionStatus),
    eventStatus: 'normal',
    overlayUrl: camera.overlayUrl,
    overlayStreamType: camera.overlayStreamType,
    overlayRenderedInStream: camera.overlayRenderedInStream,
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
