import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { getBackendWsUrl } from '../shared/api/client';
import { SimpleStompClient } from '../shared/utils/stomp';
import { aiEventFingerprint, reduceAiEventFeed, STALE_EVENT_WINDOW_MS } from '../shared/utils/aiEventFeed';
import { logger } from '../shared/utils/logger';

const unknownRecordSchema = z.record(z.string(), z.unknown());
const aiEventSchema = z.object({
  camera_id: z.string(),
  camera_login_id: z.string().nullable().optional(),
  frame_idx: z.number().default(0),
  timestamp: z.number(),
  event_type: z.string(),
  score: z.number().default(0),
  confidence: z.number().default(0),
  boxes: z.array(unknownRecordSchema).default([]),
  bbox: z.unknown().nullable().optional(),
  threshold: z.number().default(0),
  track_id: z.union([z.string(), z.number()]).nullable().optional(),
  severity: z.string().default('HIGH'),
});

export interface AiEvent {
  readonly camera_id: string;
  readonly camera_login_id?: string;
  readonly frame_idx: number;
  readonly timestamp: number;
  readonly event_type: string;
  readonly score: number;
  readonly confidence: number;
  readonly boxes: readonly Record<string, unknown>[];
  readonly bbox: unknown;
  readonly threshold: number;
  readonly track_id: string | null;
  readonly severity: string;
}

export type AiConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AiEventFeedState {
  readonly events: readonly AiEvent[];
  readonly connectionState: AiConnectionState;
  readonly lastEventAt: number | null;
}

interface UseAiEventsOptions {
  readonly url?: string;
  readonly enabled?: boolean;
  readonly topic?: string;
}

// Periodically prune stale events so UI clears itself when feed goes quiet
const PRUNE_INTERVAL_MS = 5_000;

function normalizeRawPayload(raw: Record<string, unknown>) {
  const cameraLoginId = raw.camera_login_id ?? raw.cameraLoginId;
  const timestampVal =
    typeof raw.timestamp === 'string'
      ? Math.floor(new Date(raw.timestamp as string).getTime() / 1000)
      : typeof raw.timestamp === 'number'
        ? (raw.timestamp as number)
        : Math.floor(Date.now() / 1000);

  return {
    camera_id: (raw.camera_id ?? raw.cameraId ?? raw.camera_login_id ?? raw.cameraLoginId) as string,
    camera_login_id: typeof cameraLoginId === 'string' && cameraLoginId.trim() ? cameraLoginId : undefined,
    event_type: (raw.event_type ?? raw.type) as string,
    timestamp: timestampVal,
    severity: (raw.severity ?? 'HIGH') as string,
    frame_idx: (raw.frame_idx ?? 0) as number,
    score: (raw.score ?? 0) as number,
    confidence: (raw.confidence ?? 0) as number,
    boxes: (raw.boxes ?? []) as Record<string, unknown>[],
    bbox: raw.bbox ?? null,
    threshold: (raw.threshold ?? 0) as number,
    track_id: raw.track_id ?? null,
  };
}

function parseToAiEvent(raw: Record<string, unknown>): AiEvent | null {
  try {
    const normalized = normalizeRawPayload(raw);
    const parsed = aiEventSchema.parse(normalized);
    return {
      camera_id: parsed.camera_id,
      camera_login_id: parsed.camera_login_id ?? undefined,
      frame_idx: parsed.frame_idx,
      timestamp: parsed.timestamp,
      event_type: parsed.event_type,
      score: parsed.score,
      confidence: parsed.confidence,
      boxes: parsed.boxes,
      bbox: parsed.bbox ?? null,
      threshold: parsed.threshold,
      track_id:
        parsed.track_id === null || parsed.track_id === undefined
          ? null
          : String(parsed.track_id),
      severity: parsed.severity,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('[useAiEvents] Ignoring malformed AI event payload.');
      return null;
    }
    throw error;
  }
}

export function useAiEvents(input: string | UseAiEventsOptions = {}): AiEventFeedState {
  const options = typeof input === 'string' ? { url: input, enabled: true } : input;
  const enabled = options.enabled ?? true;
  const topic = options.topic ?? '/topic/alerts';

  const defaultWsUrl = getBackendWsUrl('/ws');
  const url = options.url ?? defaultWsUrl;

  const [feedState, setFeedState] = useState<AiEventFeedState>({
    events: [],
    connectionState: 'idle',
    lastEventAt: null,
  });

  // Prune stale events on a timer
  const eventsRef = useRef<readonly AiEvent[]>([]);
  eventsRef.current = feedState.events;

  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setFeedState((prev) => {
        const pruned = prev.events.filter(
          (e) => nowMs - (e.timestamp > 1e10 ? e.timestamp : e.timestamp * 1000) <= STALE_EVENT_WINDOW_MS,
        );
        if (pruned.length === prev.events.length) return prev;
        return { ...prev, events: pruned };
      });
    }, PRUNE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFeedState({ events: [], connectionState: 'idle', lastEventAt: null });
      return undefined;
    }

    const isWebSocket = url.startsWith('ws://') || url.startsWith('wss://') || url.includes('/ws');

    const handleIncoming = (raw: Record<string, unknown>) => {
      const aiEvent = parseToAiEvent(raw);
      if (!aiEvent) {
        logger.warn('[useAiEvents] Failed to parse event or it was filtered out.');
        return;
      }
      setFeedState((prev) => ({
        connectionState: 'connected',
        lastEventAt: Date.now(),
        events: reduceAiEventFeed(prev.events, aiEvent),
      }));
    };

    if (isWebSocket) {
      logger.info(`[useAiEvents] Connecting to WebSocket topic: ${topic}`);
      setFeedState((prev) => ({ ...prev, connectionState: 'connecting' }));

      const client = new SimpleStompClient({
        url,
        topic,
        onMessage: handleIncoming,
        onStatusChange: (status) => {
          logger.info(`[useAiEvents] WebSocket status changed: ${status}`);
          if (status === 'connected') {
            setFeedState((prev) => ({ ...prev, connectionState: 'connected' }));
          } else if (status === 'disconnected') {
            setFeedState((prev) => ({ ...prev, connectionState: 'disconnected' }));
          }
        },
      });

      client.connect();

      return () => {
        client.disconnect();
        setFeedState((prev) => ({ ...prev, connectionState: 'disconnected' }));
      };
    } else {
      logger.info('[useAiEvents] Connecting to SSE EventSource.');
      setFeedState((prev) => ({ ...prev, connectionState: 'connecting' }));
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setFeedState((prev) => ({ ...prev, connectionState: 'connected' }));
      };

      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data as string) as Record<string, unknown>;
          handleIncoming(raw);
        } catch (error) {
          if (error instanceof SyntaxError) {
            logger.warn('[useAiEvents] Ignoring malformed SSE payload.');
            return;
          }
          throw error;
        }
      };

      eventSource.onerror = () => {
        logger.warn('[useAiEvents] AI event stream disconnected.');
        setFeedState((prev) => ({ ...prev, connectionState: 'disconnected' }));
      };

      return () => {
        eventSource.close();
        setFeedState((prev) => ({ ...prev, connectionState: 'disconnected' }));
      };
    }
  }, [enabled, url, topic]);

  return feedState;
}

// ---------------------------------------------------------------------------
// Backwards-compatible default export of events array for existing callers
// ---------------------------------------------------------------------------
export { aiEventFingerprint };
