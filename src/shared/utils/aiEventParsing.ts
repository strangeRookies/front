import { z } from 'zod';
import { logger } from './logger';
import type { AiEvent, AiEventSequence } from './aiEventTypes';

const unknownRecordSchema = z.record(z.string(), z.unknown());
const aiEventSequenceSchema = z.object({
  sequenceLength: z.number().optional(),
  sequenceStride: z.number().optional(),
  sequenceStartFrameId: z.number().optional(),
  sequenceEndFrameId: z.number().optional(),
  sequenceStartAtMs: z.number().optional(),
  sequenceEndAtMs: z.number().optional(),
}).partial();

const aiEventSchema = z.object({
  eventId: z.string().optional(),
  camera_id: z.string(),
  camera_login_id: z.string().nullable().optional(),
  frame_idx: z.number().default(0),
  frameId: z.number().optional(),
  frameWidth: z.number().optional(),
  frameHeight: z.number().optional(),
  timestamp: z.number(),
  capturedAtMs: z.number().optional(),
  processedAtMs: z.number().optional(),
  mqttPublishedAtMs: z.number().optional(),
  mqttReceivedAtMs: z.number().optional(),
  publishedAtMs: z.number().optional(),
  receivedAtMs: z.number().optional(),
  networkLatencyMs: z.number().optional(),
  endToEndLatencyMs: z.number().optional(),
  overlayTimestampDeltaMs: z.number().optional(),
  selectedOverlayAgeMs: z.number().optional(),
  overlayBufferSize: z.number().optional(),
  overlaySyncWarning: z.boolean().optional(),
  event_type: z.string(),
  messageType: z.string().optional(),
  score: z.number().default(0),
  confidence: z.number().default(0),
  boxes: z.array(unknownRecordSchema).default([]),
  bbox: z.unknown().nullable().optional(),
  threshold: z.number().default(0),
  track_id: z.union([z.string(), z.number()]).nullable().optional(),
  severity: z.string().default('HIGH'),
  clipUrl: z.string().optional(),
  clipPath: z.string().optional(),
  sequence: aiEventSequenceSchema.optional(),
});

export function parseToAiEvent(raw: Record<string, unknown>): AiEvent | null {
  try {
    const parsed = aiEventSchema.parse(normalizeRawPayload(raw));
    return {
      eventId: parsed.eventId,
      camera_id: parsed.camera_id,
      camera_login_id: parsed.camera_login_id ?? undefined,
      frame_idx: parsed.frame_idx,
      frameId: parsed.frameId,
      frameWidth: parsed.frameWidth,
      frameHeight: parsed.frameHeight,
      timestamp: parsed.timestamp,
      capturedAtMs: parsed.capturedAtMs,
      processedAtMs: parsed.processedAtMs,
      mqttPublishedAtMs: parsed.mqttPublishedAtMs,
      mqttReceivedAtMs: parsed.mqttReceivedAtMs,
      publishedAtMs: parsed.publishedAtMs,
      receivedAtMs: parsed.receivedAtMs,
      networkLatencyMs: parsed.networkLatencyMs,
      endToEndLatencyMs: parsed.endToEndLatencyMs,
      overlayTimestampDeltaMs: parsed.overlayTimestampDeltaMs,
      selectedOverlayAgeMs: parsed.selectedOverlayAgeMs,
      overlayBufferSize: parsed.overlayBufferSize,
      overlaySyncWarning: parsed.overlaySyncWarning,
      event_type: parsed.event_type,
      messageType: parsed.messageType,
      score: parsed.score,
      confidence: parsed.confidence,
      boxes: parsed.boxes,
      bbox: parsed.bbox ?? null,
      threshold: parsed.threshold,
      track_id: parsed.track_id === null || parsed.track_id === undefined ? null : String(parsed.track_id),
      severity: parsed.severity,
      clipUrl: parsed.clipUrl,
      clipPath: parsed.clipPath,
      sequence: parsed.sequence,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('[useAiEvents] Ignoring malformed AI event payload.');
      return null;
    }
    throw error;
  }
}

function normalizeRawPayload(raw: Record<string, unknown>) {
  const cameraLoginId = raw.camera_login_id ?? raw.cameraLoginId;
  const timestampSource = raw.timestamp ?? raw.timestampMs;
  const timestamp = typeof timestampSource === 'string'
    ? Math.floor(new Date(timestampSource).getTime() / 1000)
    : normalizeTimestamp(readNumber(timestampSource));
  return {
    eventId: readString(raw.eventId ?? raw.event_id ?? raw.alertEventId ?? raw.alert_event_id ?? raw.incidentId ?? raw.incident_id ?? raw.id),
    camera_id: readString(raw.camera_id ?? raw.cameraId ?? raw.camera_login_id ?? raw.cameraLoginId) ?? '',
    camera_login_id: readString(cameraLoginId),
    event_type: readString(raw.event_type ?? raw.type ?? raw.messageType) ?? 'unknown',
    messageType: readString(raw.messageType),
    timestamp,
    frameId: readNumber(raw.frameId ?? raw.frame_id),
    frameWidth: readNumber(raw.frameWidth ?? raw.frame_width),
    frameHeight: readNumber(raw.frameHeight ?? raw.frame_height),
    capturedAtMs: readNumber(raw.capturedAtMs ?? raw.captured_at_ms),
    processedAtMs: readNumber(raw.processedAtMs ?? raw.processed_at_ms),
    mqttPublishedAtMs: readNumber(raw.mqttPublishedAtMs ?? raw.mqtt_published_at_ms),
    mqttReceivedAtMs: readNumber(raw.mqttReceivedAtMs ?? raw.mqtt_received_at_ms),
    publishedAtMs: readNumber(raw.publishedAtMs ?? raw.published_at_ms),
    severity: readString(raw.severity) ?? 'HIGH',
    frame_idx: readNumber(raw.frame_idx) ?? 0,
    score: readNumber(raw.score) ?? 0,
    confidence: readNumber(raw.confidence) ?? 0,
    boxes: Array.isArray(raw.boxes) ? raw.boxes : Array.isArray(raw.events) ? raw.events : [],
    bbox: raw.bbox ?? null,
    threshold: readNumber(raw.threshold) ?? 0,
    track_id: raw.track_id ?? raw.trackingId ?? null,
    clipUrl: readString(raw.clipUrl ?? raw.clip_url),
    clipPath: readString(raw.clipPath ?? raw.clip_path),
    sequence: normalizeSequence(raw.sequence),
  };
}

function normalizeTimestamp(value: number | undefined): number {
  if (value === undefined) {
    return Math.floor(Date.now() / 1000);
  }
  return value > 1e10 ? value : value;
}

function normalizeSequence(value: unknown): AiEventSequence | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return {
    sequenceLength: readNumber(readObjectValue(value, 'sequenceLength') ?? readObjectValue(value, 'sequence_length')),
    sequenceStride: readNumber(readObjectValue(value, 'sequenceStride') ?? readObjectValue(value, 'sequence_stride')),
    sequenceStartFrameId: readNumber(readObjectValue(value, 'sequenceStartFrameId') ?? readObjectValue(value, 'sequence_start_frame_id')),
    sequenceEndFrameId: readNumber(readObjectValue(value, 'sequenceEndFrameId') ?? readObjectValue(value, 'sequence_end_frame_id')),
    sequenceStartAtMs: readNumber(readObjectValue(value, 'sequenceStartAtMs') ?? readObjectValue(value, 'sequence_start_at_ms')),
    sequenceEndAtMs: readNumber(readObjectValue(value, 'sequenceEndAtMs') ?? readObjectValue(value, 'sequence_end_at_ms')),
  };
}

function readObjectValue(value: object, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(value, key) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
