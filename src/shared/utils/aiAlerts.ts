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
  const cameraKey = event.camera_login_id ?? event.camera_id;
  return `${cameraKey}:${event.event_type}:${event.timestamp}:${trackId}`;
}

export { aiEventFingerprint } from './aiEventFeed';

export function formatAiEventLabel(event: AiEvent): string {
  const upper = event.event_type.trim().toUpperCase();
  const korean = getEventTypeKorean(event.event_type);
  return `${upper} (${korean}) 감지${formatOverlayDebugSuffix(event)}`;
}

export function getSeverityTone(severity: string): 'critical' | 'warning' | 'info' {
  const upper = severity.toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') return 'critical';
  if (upper === 'MEDIUM') return 'warning';
  return 'info';
}

export function findCameraForAiEvent(cameras: readonly LiveCamera[], event: AiEvent) {
  const eventTokens = [
    ...cameraIdTokens(event.camera_login_id),
    ...cameraIdTokens(event.camera_id),
  ].filter(Boolean);
  return cameras.find((camera) => {
    const cameraTokens = new Set([
      normalizeCameraToken(camera.cameraLoginId),
      normalizeCameraToken(camera.cameraDbId),
      normalizeCameraToken(camera.id),
      normalizeCameraToken(camera.name),
      normalizeCameraToken(camera.location),
      ...cameraIdTokens(camera.cameraLoginId),
      ...cameraIdTokens(camera.id),
      ...cameraIdTokens(camera.name),
    ].filter(Boolean));
    return eventTokens.some((token) => cameraTokens.has(token));
  });
}

export function getEventTypeKorean(type: string): string {
  const upper = type.toUpperCase();
  if (upper.includes('FALL')) return '낙상';
  if (upper.includes('FAINT') || upper.includes('SYNCOPE') || upper.includes('UNCONSCIOUS')) return '실신';
  if (upper.includes('COLLAPSE')) return '쓰러짐';
  if (upper.includes('VIOLENCE') || upper.includes('FIGHT')) return '폭력';
  if (upper.includes('CROWD')) return '군중';
  if (upper.includes('FIRE')) return '화재';
  if (upper.includes('UNAUTHORIZED_EXIT')) return '무단 이탈';
  return type;
}

export function markAiDangerCameras(cameras: readonly LiveCamera[], events: readonly AiEvent[]) {
  return cameras.map((camera) => {
    const matchingEvent = events.find((event) => {
      if (!isDangerAiEvent(event)) return false;
      const cameraObj = findCameraForAiEvent(cameras, event);
      return cameraObj?.id === camera.id;
    });

    if (!matchingEvent) {
      return camera;
    }

    return {
      ...camera,
      eventStatus: 'danger' as const,
      eventLabel: formatAiEventLabel(matchingEvent),
    };
  });
}

export function focusCameraFirst(cameras: readonly LiveCamera[], focusedCameraId: string | null) {
  if (!focusedCameraId) {
    return [...cameras];
  }
  const focused = cameras.find((camera) => camera.id === focusedCameraId);
  if (!focused) {
    return [...cameras];
  }
  return [focused, ...cameras.filter((camera) => camera.id !== focusedCameraId)];
}

function formatOverlayDebugSuffix(event: AiEvent): string {
  if (import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG !== 'true') {
    return '';
  }
  const parts = [
    event.frameId !== undefined ? `frame ${event.frameId}` : undefined,
    event.overlayTimestampDeltaMs !== undefined ? `delta ${Math.round(event.overlayTimestampDeltaMs)}ms` : undefined,
    event.endToEndLatencyMs !== undefined ? `e2e ${Math.round(event.endToEndLatencyMs)}ms` : undefined,
    formatSequenceRange(event),
  ].filter(Boolean);
  return parts.length === 0 ? '' : ` · ${parts.join(' · ')}`;
}

function formatSequenceRange(event: AiEvent): string | undefined {
  const sequence = event.sequence;
  if (!sequence) {
    return undefined;
  }
  if (sequence.sequenceStartFrameId !== undefined || sequence.sequenceEndFrameId !== undefined) {
    return `seq ${sequence.sequenceStartFrameId ?? '?'}-${sequence.sequenceEndFrameId ?? '?'}`;
  }
  if (sequence.sequenceStartAtMs !== undefined || sequence.sequenceEndAtMs !== undefined) {
    return `seq ${sequence.sequenceStartAtMs ?? '?'}-${sequence.sequenceEndAtMs ?? '?'}ms`;
  }
  return undefined;
}

function cameraIdTokens(value?: string) {
  if (!value) {
    return [];
  }
  const normalized = normalizeCameraToken(value);
  if (!normalized) {
    return [];
  }
  const numeric = normalized.match(/\d+/)?.[0];
  if (!numeric) {
    return [normalized];
  }
  const unpadded = String(Number(numeric));
  const padded = unpadded.padStart(2, '0');
  return [normalized, `camera${unpadded}`, `cam${unpadded}`, `cctv${unpadded}`, `cctv${padded}`];
}

function normalizeCameraToken(value?: string) {
  if (!value) {
    return '';
  }
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
