import type { LiveCamera } from '../../features/dashboard/data/cameras';
import type { AiEvent } from '../../hooks/useAiEvents';
import type { AiScenarioType } from './aiEventTypes';

export type AiAlertPage = 'admin' | 'company' | 'personal';

export interface ScenarioPresentation {
  readonly label: string;
  readonly tone: 'critical' | 'warning' | 'info';
  readonly icon: 'collapse' | 'syncope' | 'fall' | 'exit' | 'hazard';
}

const SCENARIO_PRESENTATIONS: Record<AiScenarioType, ScenarioPresentation> = {
  COLLAPSE: { label: '쓰러짐 감지', tone: 'warning', icon: 'collapse' },
  SYNCOPE: { label: '실신(미회복) 감지', tone: 'critical', icon: 'syncope' },
  FALL_BED: { label: '낙상 감지', tone: 'warning', icon: 'fall' },
  EXIT: { label: '이탈 감지', tone: 'info', icon: 'exit' },
  HAZARD_ZONE: { label: '위험구역 진입', tone: 'critical', icon: 'hazard' },
  ASSAULT: { label: '폭행 감지', tone: 'critical', icon: 'hazard' },
};

export function isAiAlertEnabledRoute(page: AiAlertPage) {
  return page !== 'admin';
}

export function isDangerAiEvent(event: AiEvent) {
  return event.scenarioType !== undefined;
}

export function aiEventKey(event: AiEvent) {
  const trackId = event.track_id ?? 'no-track';
  const cameraKey = event.camera_login_id ?? event.camera_id;
  return `${cameraKey}:${event.scenarioType ?? 'no-scenario'}:${event.timestamp}:${trackId}`;
}

export { aiEventFingerprint } from './aiEventFeed';

export function getScenarioPresentation(scenarioType: AiScenarioType): ScenarioPresentation {
  return SCENARIO_PRESENTATIONS[scenarioType];
}

export function formatAiEventLabel(event: AiEvent): string {
  const presentation = event.scenarioType ? getScenarioPresentation(event.scenarioType) : undefined;
  return `${presentation?.label ?? 'AI 알림'}${formatOverlayDebugSuffix(event)}`;
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
  return parts.length === 0 ? '' : ` | ${parts.join(' | ')}`;
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
