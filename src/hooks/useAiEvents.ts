import { useEffect, useRef, useState } from 'react';
import { getBackendWsUrl } from '../shared/api/client';
import { SimpleStompClient } from '../shared/utils/stomp';
import { aiEventFingerprint, eventTimestampMs, reduceAiEventFeed, STALE_EVENT_WINDOW_MS } from '../shared/utils/aiEventFeed';
import { logger } from '../shared/utils/logger';
import { parseToAiEvent } from '../shared/utils/aiEventParsing';
import type { AiEvent } from '../shared/utils/aiEventTypes';
import {
  OverlaySyncBuffer,
  cameraKey,
  enrichOverlayPayload,
  overlaySyncDebugEnabled,
  overlaySyncOptionsFromEnv,
} from '../shared/utils/overlaySync';

type BufferedAiEvent = AiEvent & { readonly receivedAtMs: number };

export type AiConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AiEventFeedState {
  readonly events: readonly AiEvent[];
  readonly overlayEvents: readonly AiEvent[];
  readonly connectionState: AiConnectionState;
  readonly lastEventAt: number | null;
}

interface UseAiEventsOptions {
  readonly url?: string;
  readonly enabled?: boolean;
  readonly topic?: string;
}

const PRUNE_INTERVAL_MS = 5_000;

export function useAiEvents(input: string | UseAiEventsOptions = {}): AiEventFeedState {
  const options = typeof input === 'string' ? { url: input, enabled: true } : input;
  const enabled = options.enabled ?? true;
  const topic = options.topic ?? '/topic/alerts';

  const defaultWsUrl = getBackendWsUrl('/ws');
  const url = options.url ?? defaultWsUrl;

  const [feedState, setFeedState] = useState<AiEventFeedState>({
    events: [],
    overlayEvents: [],
    connectionState: 'idle',
    lastEventAt: null,
  });
  const overlayBufferRef = useRef(new OverlaySyncBuffer<BufferedAiEvent>(overlaySyncOptionsFromEnv(import.meta.env)));
  const overlayDebug = overlaySyncDebugEnabled(import.meta.env);

  // Prune stale events on a timer
  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setFeedState((prev) => {
        const prunedEvents = prev.events.filter((e) => nowMs - eventTimestampMs(e) <= STALE_EVENT_WINDOW_MS);
        const prunedOverlays = prev.overlayEvents.filter((e) => nowMs - eventTimestampMs(e) <= STALE_EVENT_WINDOW_MS);
        if (prunedEvents.length === prev.events.length && prunedOverlays.length === prev.overlayEvents.length) return prev;
        return { ...prev, events: prunedEvents, overlayEvents: prunedOverlays };
      });
    }, PRUNE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFeedState({ events: [], overlayEvents: [], connectionState: 'idle', lastEventAt: null });
      return undefined;
    }

    const isWebSocket = url.startsWith('ws://') || url.startsWith('wss://') || url.includes('/ws');

    const handleIncoming = (raw: Record<string, unknown>) => {
      const receivedAtMs = Date.now();
      const parsedEvent = parseToAiEvent(raw);
      if (!parsedEvent) {
        logger.warn('[useAiEvents] Failed to parse event or it was filtered out.');
        return;
      }
      logAiAlertLatency(parsedEvent, raw, receivedAtMs);
      const enrichedEvent = enrichOverlayPayload(parsedEvent, receivedAtMs);
      const selected = overlayBufferRef.current.push(enrichedEvent, receivedAtMs);
      const selectedOverlayEvent: AiEvent = {
        ...selected.event,
        overlayBufferSize: selected.bufferSize,
        overlaySyncWarning: selected.warning,
      };
      const incomingEvent: AiEvent = {
        ...enrichedEvent,
        overlayTimestampDeltaMs: selectedOverlayEvent.overlayTimestampDeltaMs,
        selectedOverlayAgeMs: selectedOverlayEvent.selectedOverlayAgeMs,
        overlayBufferSize: selected.bufferSize,
        overlaySyncWarning: selected.warning,
      };
      const aiEvent = isOverlayEvent(enrichedEvent) ? selectedOverlayEvent : incomingEvent;
      logOverlaySync(aiEvent, selected.warning, overlayDebug);
      setFeedState((prev) => ({
        connectionState: 'connected',
        lastEventAt: receivedAtMs,
        events: isOverlayEvent(aiEvent) ? prev.events : reduceAiEventFeed(prev.events, aiEvent),
        overlayEvents: isOverlayEvent(aiEvent) ? reduceAiEventFeed(prev.overlayEvents, aiEvent) : prev.overlayEvents,
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

export { aiEventFingerprint };
export type { AiEvent, AiEventSequence } from '../shared/utils/aiEventTypes';

function isOverlayEvent(event: AiEvent): boolean {
  return event.messageType === 'overlay' || event.event_type === 'overlay';
}

function logOverlaySync(event: AiEvent, warning: boolean, debugEnabled: boolean): void {
  if (!debugEnabled && !warning) {
    return;
  }
  const message = [
    `[overlay-sync] camera=${cameraKey(event)}`,
    `frameId=${event.frameId ?? 'n/a'}`,
    `capturedAtMs=${event.capturedAtMs ?? 'n/a'}`,
    `mqttReceivedAtMs=${event.mqttReceivedAtMs ?? 'n/a'}`,
    `publishedAtMs=${event.publishedAtMs ?? 'n/a'}`,
    `receivedAtMs=${event.receivedAtMs ?? 'n/a'}`,
    `networkLatencyMs=${event.networkLatencyMs ?? 'n/a'}`,
    `endToEndLatencyMs=${event.endToEndLatencyMs ?? 'n/a'}`,
    `selectedOverlayAgeMs=${event.selectedOverlayAgeMs ?? 'n/a'}`,
    `overlayTimestampDeltaMs=${event.overlayTimestampDeltaMs ?? 'n/a'}`,
    `bufferSize=${event.overlayBufferSize ?? 'n/a'}`,
    sequenceLabel(event),
  ].filter(Boolean).join(' ');
  if (warning) {
    logger.warn(message);
    return;
  }
  logger.info(message);
}

function logAiAlertLatency(event: AiEvent, raw: Record<string, unknown>, receivedAtMs: number): void {
  if (isOverlayEvent(event)) {
    return;
  }

  const rawTimestampMs = readLatencyNumber(raw.timestampMs ?? raw.timestamp_ms);
  const rawTimestamp = readLatencyNumber(raw.timestamp);
  const capturedAtMs = event.capturedAtMs;
  const processedAtMs = event.processedAtMs;
  const mqttReceivedAtMs = event.mqttReceivedAtMs;
  const publishedAtMs = event.publishedAtMs;
  const eventTimestampMs = timestampToMs(event.timestamp);

  logger.info(`[ai-alert-latency] ${JSON.stringify({
    cameraId: event.camera_id,
    cameraLoginId: event.camera_login_id ?? null,
    eventType: event.event_type,
    severity: event.severity,
    frameId: event.frameId ?? null,
    trackId: event.track_id,
    receivedAtMs,
    rawTimestamp,
    rawTimestampMs,
    eventTimestamp: event.timestamp,
    eventTimestampMs,
    capturedAtMs: capturedAtMs ?? null,
    processedAtMs: processedAtMs ?? null,
    mqttReceivedAtMs: mqttReceivedAtMs ?? null,
    publishedAtMs: publishedAtMs ?? null,
    aiProcessingDelayMs: diffMs(processedAtMs, capturedAtMs),
    mqttBridgeDelayMs: diffMs(mqttReceivedAtMs, processedAtMs),
    backendPublishDelayMs: diffMs(publishedAtMs, mqttReceivedAtMs),
    stompReceiveDelayMs: publishedAtMs === undefined ? null : receivedAtMs - publishedAtMs,
    lagFromEventTimestampMs: eventTimestampMs === null ? null : receivedAtMs - eventTimestampMs,
    lagFromCapturedMs: capturedAtMs === undefined ? null : receivedAtMs - capturedAtMs,
    lagFromProcessedMs: processedAtMs === undefined ? null : receivedAtMs - processedAtMs,
    lagFromMqttReceivedMs: mqttReceivedAtMs === undefined ? null : receivedAtMs - mqttReceivedAtMs,
    lagFromPublishedMs: publishedAtMs === undefined ? null : receivedAtMs - publishedAtMs,
  })}`);
}

function diffMs(end: number | undefined, start: number | undefined): number | null {
  return end === undefined || start === undefined ? null : end - start;
}

function timestampToMs(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value > 1e10 ? value : value * 1000;
}

function readLatencyNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sequenceLabel(event: AiEvent): string {
  const sequence = event.sequence;
  if (!sequence) {
    return '';
  }
  if (sequence.sequenceStartFrameId !== undefined || sequence.sequenceEndFrameId !== undefined) {
    return `sequenceFrames=${sequence.sequenceStartFrameId ?? 'n/a'}-${sequence.sequenceEndFrameId ?? 'n/a'}`;
  }
  if (sequence.sequenceStartAtMs !== undefined || sequence.sequenceEndAtMs !== undefined) {
    return `sequenceMs=${sequence.sequenceStartAtMs ?? 'n/a'}-${sequence.sequenceEndAtMs ?? 'n/a'}`;
  }
  return '';
}
