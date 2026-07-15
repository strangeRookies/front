export const AI_SCENARIO_TYPES = [
  'COLLAPSE',
  'SYNCOPE',
  'FALL_BED',
  'EXIT',
  'HAZARD_ZONE',
] as const;

export type AiScenarioType = typeof AI_SCENARIO_TYPES[number];

export interface AiEvent {
  readonly eventId?: string;
  readonly camera_id: string;
  readonly camera_login_id?: string;
  readonly frame_idx: number;
  readonly frameId?: number;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly timestamp: number;
  readonly capturedAtMs?: number;
  readonly processedAtMs?: number;
  readonly mqttPublishedAtMs?: number;
  readonly mqttReceivedAtMs?: number;
  readonly publishedAtMs?: number;
  readonly receivedAtMs?: number;
  readonly networkLatencyMs?: number;
  readonly endToEndLatencyMs?: number;
  readonly overlayTimestampDeltaMs?: number;
  readonly selectedOverlayAgeMs?: number;
  readonly overlayBufferSize?: number;
  readonly overlaySyncWarning?: boolean;
  readonly event_type: string;
  /** Backend-normalized type used for every user-facing alert decision. */
  readonly scenarioType?: AiScenarioType;
  readonly messageType?: string;
  readonly score: number;
  readonly confidence: number;
  readonly boxes: readonly Record<string, unknown>[];
  readonly bbox: unknown;
  readonly threshold: number;
  readonly track_id: string | null;
  readonly severity: string;
  readonly clipUrl?: string;
  readonly clipPath?: string;
  readonly sequence?: AiEventSequence;
}

export interface AiEventSequence {
  readonly sequenceLength?: number;
  readonly sequenceStride?: number;
  readonly sequenceStartFrameId?: number;
  readonly sequenceEndFrameId?: number;
  readonly sequenceStartAtMs?: number;
  readonly sequenceEndAtMs?: number;
}
