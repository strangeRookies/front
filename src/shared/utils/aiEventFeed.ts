import type { AiEvent } from '../../hooks/useAiEvents';

// ---------------------------------------------------------------------------
// Stable fingerprint: camera + eventType + trackId + bbox
// timestamp를 쓰지 않으므로, 같은 실물 사건이 반복 publish돼도 동일 key가 된다.
// ---------------------------------------------------------------------------
export function aiEventFingerprint(event: AiEvent): string {
  // Prefer stable incident id: originalEventId (legacy dual-id case) or eventId
  const stableId = event.originalEventId || event.eventId;
  if (stableId) {
    return stableId;
  }
  const normalizedType = event.scenarioType ?? 'no-scenario';
  const normalizedCamera = event.camera_id.trim().toLowerCase();
  const normalizedTrack = event.track_id != null ? String(event.track_id).trim() : 'no-track';
  const bboxKey = Array.isArray(event.bbox) ? (event.bbox as number[]).map((n) => n.toFixed(1)).join(',') : 'no-bbox';
  return `${normalizedCamera}:${normalizedType}:${normalizedTrack}:${bboxKey}`;
}

// ---------------------------------------------------------------------------
// Feed reducer: 15초 stale window + fingerprint 기반 deduplication
// ---------------------------------------------------------------------------
export const STALE_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;

export function eventTimestampMs(event: AiEvent): number {
  // timestamp가 Unix epoch (초) 단위인 경우 ms 변환
  return event.capturedAtMs ?? event.receivedAtMs ?? (event.timestamp > 1e10 ? event.timestamp : event.timestamp * 1000);
}

function pruneExpiredAiEvents(events: readonly AiEvent[], nowMs: number): AiEvent[] {
  return events.filter((e) => nowMs - eventTimestampMs(e) <= STALE_EVENT_WINDOW_MS);
}

export function reduceAiEventFeed(
  events: readonly AiEvent[],
  incoming: AiEvent,
  nowMs: number = Date.now(),
): AiEvent[] {
  const activeEvents = pruneExpiredAiEvents(events, nowMs);
  const fp = aiEventFingerprint(incoming);
  const previous = activeEvents.find((e) => aiEventFingerprint(e) === fp);
  const merged = previous ? mergeAiEvent(previous, incoming) : incoming;
  // 동일 fingerprint의 기존 이벤트를 교체 후 최신순 유지
  const rest = activeEvents.filter((e) => aiEventFingerprint(e) !== fp);
  return [merged, ...rest].slice(0, 12);
}

function mergeAiEvent(previous: AiEvent, incoming: AiEvent): AiEvent {
  const merged: AiEvent = {
    ...previous,
    ...incoming,
    eventId: incoming.eventId ?? previous.eventId,
    capturedAtMs: incoming.capturedAtMs ?? previous.capturedAtMs,
    processedAtMs: incoming.processedAtMs ?? previous.processedAtMs,
    mqttPublishedAtMs: incoming.mqttPublishedAtMs ?? previous.mqttPublishedAtMs,
    mqttReceivedAtMs: incoming.mqttReceivedAtMs ?? previous.mqttReceivedAtMs,
    publishedAtMs: incoming.publishedAtMs ?? previous.publishedAtMs,
    receivedAtMs: incoming.receivedAtMs ?? previous.receivedAtMs,
    networkLatencyMs: incoming.networkLatencyMs ?? previous.networkLatencyMs,
    endToEndLatencyMs: incoming.endToEndLatencyMs ?? previous.endToEndLatencyMs,
    overlayTimestampDeltaMs: incoming.overlayTimestampDeltaMs ?? previous.overlayTimestampDeltaMs,
    selectedOverlayAgeMs: incoming.selectedOverlayAgeMs ?? previous.selectedOverlayAgeMs,
    overlayBufferSize: incoming.overlayBufferSize ?? previous.overlayBufferSize,
    overlaySyncWarning: incoming.overlaySyncWarning ?? previous.overlaySyncWarning,
    clipUrl: incoming.clipUrl ?? previous.clipUrl,
    clipPath: incoming.clipPath ?? previous.clipPath,
    snapshotUrl: incoming.snapshotUrl ?? previous.snapshotUrl,
    primarySnapshotUrl: incoming.primarySnapshotUrl ?? previous.primarySnapshotUrl ?? incoming.snapshotUrl ?? previous.snapshotUrl,
    sequence: incoming.sequence ?? previous.sequence,
  };
  // Preserve earliest timestamp when merging legacy dual-id (unrecovered)
  if (previous.capturedAtMs && incoming.capturedAtMs) {
    (merged as any).capturedAtMs = Math.min(previous.capturedAtMs, incoming.capturedAtMs);
  }
  // Keep higher confidence if available
  if (typeof (incoming as any).confidence === 'number' && typeof (previous as any).confidence === 'number') {
    (merged as any).confidence = Math.max((previous as any).confidence, (incoming as any).confidence);
  }
  // Update scenario when unrecovered arrives for same incident
  if (incoming.scenarioType) (merged as any).scenarioType = incoming.scenarioType;
  return merged;
}

// ---------------------------------------------------------------------------
// Acknowledgement set 만료 정책:
// active events 목록에 없는 fingerprint는 acknowledged set에서 제거
// ---------------------------------------------------------------------------
export function pruneAcknowledgedFingerprints(
  acknowledged: ReadonlySet<string>,
  activeDangerEvents: readonly AiEvent[],
): Set<string> {
  const activeFingerprints = new Set(activeDangerEvents.map(aiEventFingerprint));
  const next = new Set<string>();
  for (const fp of acknowledged) {
    if (activeFingerprints.has(fp)) next.add(fp);
  }
  return next;
}
