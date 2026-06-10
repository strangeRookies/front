import { useEffect, useState } from 'react';
import { LIVE_CAMERAS, STREAM_BASE_URL, configuredStreamUrl, streamUrl, type CameraConnectionStatus, type LiveCamera } from '../data/cameras';

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
  });
}

export function useLiveCameras(refreshMs = 5000) {
  const [cameras, setCameras] = useState<LiveCamera[]>(LIVE_CAMERAS);

  useEffect(() => {
    let cancelled = false;
    let consecutiveFailures = 0;
    let timer: number | undefined;

    async function refresh() {
      try {
        const response = await fetch(`${STREAM_BASE_URL}/cameras`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`camera status ${response.status}`);
        const payload = (await response.json()) as CameraStatusResponse;
        if (!cancelled) {
          consecutiveFailures = 0;
          setCameras(current => mergeCameraStatus(current, payload));
        }
      } catch {
        if (!cancelled) {
          consecutiveFailures++;
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
