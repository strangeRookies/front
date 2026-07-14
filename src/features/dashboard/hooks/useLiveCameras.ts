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
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[camera-stream-resolve]', {
      id: cameraLoginId,
      cameraLoginId,
      cameraDbId: camera.cameraId,
      overlayUrl: camera.overlayUrl ?? null,
      resolvedStreamUrl: resolvedStream.streamUrl,
      streamKind: resolvedStream.streamKind,
      assignedVideoPath: camera.assignedVideoPath ?? null,
      rtspUrl: camera.rtspUrl ?? null,
    });
  }
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

function warnDuplicateStreamBindings(cameras: LiveCamera[]): void {
  if (!import.meta.env.DEV || cameras.length === 0) {
    return;
  }
  const byOverlay = new Map<string, string[]>();
  const byStream = new Map<string, string[]>();
  for (const camera of cameras) {
    const loginId = camera.cameraLoginId || camera.id;
    if (camera.overlayUrl) {
      const list = byOverlay.get(camera.overlayUrl) ?? [];
      list.push(loginId);
      byOverlay.set(camera.overlayUrl, list);
    }
    if (camera.streamUrl) {
      const list = byStream.get(camera.streamUrl) ?? [];
      list.push(loginId);
      byStream.set(camera.streamUrl, list);
    }
  }
  for (const [overlayUrl, loginIds] of byOverlay) {
    if (loginIds.length > 1) {
      // eslint-disable-next-line no-console
      console.warn('[camera-stream-resolve][warning] duplicate overlayUrl bound to multiple cards', {
        overlayUrl,
        cameras: loginIds,
      });
    }
  }
  for (const [streamUrl, loginIds] of byStream) {
    if (loginIds.length > 1) {
      // eslint-disable-next-line no-console
      console.warn('[camera-stream-resolve][warning] duplicate resolved streamUrl bound to multiple cards', {
        streamUrl,
        cameras: loginIds,
      });
    }
  }
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
          warnDuplicateStreamBindings(activeLiveCameras);
          setCameras(activeLiveCameras);
        }
      } catch {
        if (!cancelled) {
          consecutiveFailures++;
          try {
            const activeCameras = await fetchActiveCameras();
            const activeLiveCameras = activeCameras
              .filter(isFrontendVisibleCamera)
              .map(activeCameraToLiveCamera);
            warnDuplicateStreamBindings(activeLiveCameras);
            setCameras(activeLiveCameras);
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
