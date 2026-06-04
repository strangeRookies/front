import type { LiveCamera } from '../../features/dashboard/data/cameras';
import type { AiEvent } from '../../hooks/useAiEvents';

export type AiAlertPage = 'admin' | 'company' | 'personal';

export function isAiAlertEnabledRoute(page: AiAlertPage) {
  return page !== 'admin';
}

export function isDangerAiEvent(event: AiEvent) {
  return event.event_type !== 'Normal';
}

export function aiEventKey(event: AiEvent) {
  const trackId = event.track_id ?? 'no-track';
  return `${event.camera_id}:${event.event_type}:${event.timestamp}:${trackId}`;
}

export function findCameraForAiEvent(cameras: readonly LiveCamera[], event: AiEvent) {
  const eventTokens = cameraIdTokens(event.camera_id);
  return cameras.find(camera => {
    const cameraTokens = new Set([
      normalizeCameraToken(camera.id),
      normalizeCameraToken(camera.name),
      normalizeCameraToken(camera.location),
      ...cameraIdTokens(camera.id),
      ...cameraIdTokens(camera.name),
    ]);
    return eventTokens.some(token => cameraTokens.has(token));
  });
}

export function markAiDangerCameras(cameras: readonly LiveCamera[], events: readonly AiEvent[]) {
  const dangerCameraIds = new Set(
    events
      .filter(isDangerAiEvent)
      .map(event => findCameraForAiEvent(cameras, event)?.id)
      .filter((cameraId): cameraId is string => cameraId !== undefined),
  );
  return cameras.map(camera => {
    if (!dangerCameraIds.has(camera.id)) {
      return camera;
    }
    return {
      ...camera,
      eventStatus: 'danger' as const,
      eventLabel: 'AI ALERT',
    };
  });
}

export function focusCameraFirst(cameras: readonly LiveCamera[], focusedCameraId: string | null) {
  if (!focusedCameraId) {
    return [...cameras];
  }
  const focused = cameras.find(camera => camera.id === focusedCameraId);
  if (!focused) {
    return [...cameras];
  }
  return [focused, ...cameras.filter(camera => camera.id !== focusedCameraId)];
}

function cameraIdTokens(value: string) {
  const normalized = normalizeCameraToken(value);
  const numeric = normalized.match(/\d+/)?.[0];
  if (!numeric) {
    return [normalized];
  }
  const unpadded = String(Number(numeric));
  const padded = unpadded.padStart(2, '0');
  return [normalized, `camera${unpadded}`, `cam${unpadded}`, `cctv${unpadded}`, `cctv${padded}`];
}

function normalizeCameraToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
