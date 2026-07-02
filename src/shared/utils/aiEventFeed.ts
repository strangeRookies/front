import type { AiEvent } from '../../hooks/useAiEvents';

// ---------------------------------------------------------------------------
// Stable fingerprint: camera + eventType + trackId + bbox
// timestamp를 쓰지 않으므로, 같은 실물 사건이 반복 publish돼도 동일 key가 된다.
// ---------------------------------------------------------------------------
export function aiEventFingerprint(event: AiEvent): string {
  const normalizedType = event.event_type.trim().toUpperCase();
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
  // 동일 fingerprint의 기존 이벤트를 교체 후 최신순 유지
  const rest = activeEvents.filter((e) => aiEventFingerprint(e) !== fp);
  return [incoming, ...rest].slice(0, 12);
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
