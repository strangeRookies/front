export interface OverlaySyncIdentity {
  readonly cameraId?: string;
  readonly camera_id?: string;
  readonly cameraLoginId?: string;
  readonly camera_login_id?: string;
}

export interface OverlaySyncPayload extends OverlaySyncIdentity {
  readonly frameId?: number;
  readonly capturedAtMs?: number;
  readonly publishedAtMs?: number;
  readonly receivedAtMs: number;
  readonly networkLatencyMs?: number;
  readonly endToEndLatencyMs?: number;
  readonly overlayTimestampDeltaMs?: number;
  readonly selectedOverlayAgeMs?: number;
}

export interface OverlaySyncOptions {
  readonly overlayDelayMs: number;
  readonly maxBufferAgeMs: number;
  readonly maxBufferSize: number;
  readonly matchThresholdMs: number;
}

export interface OverlaySyncSelection<T extends OverlaySyncPayload> {
  readonly event: T;
  readonly bufferSize: number;
  readonly warning: boolean;
}

const DEFAULT_OPTIONS = {
  overlayDelayMs: 300,
  maxBufferAgeMs: 5_000,
  maxBufferSize: 300,
  matchThresholdMs: 200,
} as const satisfies OverlaySyncOptions;

export function overlaySyncOptionsFromEnv(env: ImportMetaEnv): OverlaySyncOptions {
  return {
    overlayDelayMs: readPositiveInt(env.VITE_FRONT_OVERLAY_DELAY_MS, DEFAULT_OPTIONS.overlayDelayMs),
    maxBufferAgeMs: readPositiveInt(env.VITE_FRONT_OVERLAY_MAX_BUFFER_AGE_MS, DEFAULT_OPTIONS.maxBufferAgeMs),
    maxBufferSize: readPositiveInt(env.VITE_FRONT_OVERLAY_MAX_BUFFER_SIZE, DEFAULT_OPTIONS.maxBufferSize),
    matchThresholdMs: readPositiveInt(env.VITE_FRONT_OVERLAY_MATCH_THRESHOLD_MS, DEFAULT_OPTIONS.matchThresholdMs),
  };
}

export function overlaySyncDebugEnabled(env: ImportMetaEnv): boolean {
  return env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true';
}

export class OverlaySyncBuffer<T extends OverlaySyncPayload> {
  private readonly options: OverlaySyncOptions;
  private readonly buffers = new Map<string, T[]>();

  constructor(options: OverlaySyncOptions = DEFAULT_OPTIONS) {
    this.options = options;
  }

  push(event: T, nowMs: number = Date.now()): OverlaySyncSelection<T> {
    const key = cameraKey(event);
    const buffer = this.prunedBuffer(key, nowMs);
    buffer.push(event);
    while (buffer.length > this.options.maxBufferSize) {
      buffer.shift();
    }
    this.buffers.set(key, buffer);
    return this.select(key, nowMs);
  }

  select(cameraId: string, nowMs: number = Date.now(), frameId?: number): OverlaySyncSelection<T> {
    const key = normalizeCameraKey(cameraId);
    const buffer = this.prunedBuffer(key, nowMs);
    this.buffers.set(key, buffer);
    if (buffer.length === 0) {
      throw new OverlaySyncEmptyBufferError(key);
    }
    const targetTimeMs = nowMs - this.options.overlayDelayMs;
    const byFrameId = frameId === undefined ? undefined : nearestByFrameId(buffer, frameId);
    const selected = byFrameId ?? nearestByTime(buffer, targetTimeMs);
    const overlayTimestampDeltaMs = Math.abs(matchTimestamp(selected) - targetTimeMs);
    const selectedOverlayAgeMs = Math.max(0, nowMs - selected.receivedAtMs);
    const event = {
      ...selected,
      overlayTimestampDeltaMs,
      selectedOverlayAgeMs,
    };
    return {
      event,
      bufferSize: buffer.length,
      warning: overlayTimestampDeltaMs > this.options.matchThresholdMs,
    };
  }

  size(cameraId: string): number {
    return this.buffers.get(normalizeCameraKey(cameraId))?.length ?? 0;
  }

  private prunedBuffer(cameraId: string, nowMs: number): T[] {
    const minReceivedAt = nowMs - this.options.maxBufferAgeMs;
    return (this.buffers.get(normalizeCameraKey(cameraId)) ?? []).filter((event) => event.receivedAtMs >= minReceivedAt);
  }
}

export function enrichOverlayPayload<T extends Omit<OverlaySyncPayload, 'receivedAtMs' | 'networkLatencyMs' | 'endToEndLatencyMs'>>(
  payload: T,
  receivedAtMs: number,
): T & OverlaySyncPayload {
  return {
    ...payload,
    receivedAtMs,
    networkLatencyMs: latency(payload.publishedAtMs, receivedAtMs),
    endToEndLatencyMs: latency(payload.capturedAtMs, receivedAtMs),
  };
}

export function cameraKey(payload: OverlaySyncIdentity): string {
  return normalizeCameraKey(
    payload.cameraLoginId ?? payload.camera_login_id ?? payload.cameraId ?? payload.camera_id ?? 'unknown-camera',
  );
}

function normalizeCameraKey(value: string): string {
  return value.trim().toLowerCase();
}

export class OverlaySyncEmptyBufferError extends Error {
  constructor(cameraId: string) {
    super(`Overlay buffer is empty for camera ${cameraId}`);
    this.name = 'OverlaySyncEmptyBufferError';
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function latency(startMs: number | undefined, endMs: number): number | undefined {
  return startMs === undefined ? undefined : Math.max(0, endMs - startMs);
}

function nearestByFrameId<T extends OverlaySyncPayload>(buffer: readonly T[], frameId: number): T | undefined {
  if (buffer.length === 0) {
    return undefined;
  }
  return buffer.reduce<T | undefined>((best, event) => {
    if (event.frameId === undefined) {
      return best;
    }
    if (best === undefined || best.frameId === undefined) {
      return event;
    }
    return Math.abs(event.frameId - frameId) < Math.abs(best.frameId - frameId) ? event : best;
  }, undefined);
}

function nearestByTime<T extends OverlaySyncPayload>(buffer: readonly T[], targetTimeMs: number): T {
  return buffer.reduce((best, event) => {
    return Math.abs(matchTimestamp(event) - targetTimeMs) < Math.abs(matchTimestamp(best) - targetTimeMs) ? event : best;
  });
}

function matchTimestamp(event: OverlaySyncPayload): number {
  return event.capturedAtMs ?? event.receivedAtMs;
}

export interface MinimalOverlayMessage {
  readonly timestampMs?: number;
  readonly capturedAtMs?: number;
  readonly processedAtMs?: number;
  readonly publishedAtMs?: number;
}

export interface MinimalAiEvent {
  readonly timestamp: number;
  readonly capturedAtMs?: number;
}

export function selectOverlayForDisplay<T extends MinimalOverlayMessage>(
  overlayBuffer: readonly T[],
  displayTargetMs: number,
  maxMatchDeltaMs: number = 300,
  maxAgeMs: number = 1000,
  nowMs: number = Date.now(),
): { overlay: T | undefined; deltaMs: number; reason?: string } {
  if (overlayBuffer.length === 0) {
    return { overlay: undefined, deltaMs: 0, reason: 'Buffer is empty' };
  }

  let closest: T | undefined = undefined;
  let minDiff = Infinity;

  for (const msg of overlayBuffer) {
    const msgTime = msg.timestampMs ?? msg.capturedAtMs;
    if (msgTime === undefined || msgTime === null) continue;

    const diff = Math.abs(msgTime - displayTargetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = msg;
    }
  }

  if (!closest) {
    return { overlay: undefined, deltaMs: 0, reason: 'No valid timestamp found in buffer' };
  }

  const closestTime = closest.timestampMs ?? closest.capturedAtMs ?? nowMs;
  const overlayAge = nowMs - closestTime;

  if (minDiff > maxMatchDeltaMs) {
    return {
      overlay: undefined,
      deltaMs: minDiff,
      reason: `Match delta too large (${Math.round(minDiff)}ms > ${maxMatchDeltaMs}ms)`,
    };
  }

  if (overlayAge > maxAgeMs) {
    return {
      overlay: undefined,
      deltaMs: minDiff,
      reason: `Overlay too stale (${Math.round(overlayAge)}ms > ${maxAgeMs}ms)`,
    };
  }

  return { overlay: closest, deltaMs: minDiff };
}

export function isEventStale<T extends MinimalAiEvent>(
  event: T | undefined,
  maxAgeMs: number = 1000,
  nowMs: number = Date.now(),
): boolean {
  if (!event) return true;
  if (event.capturedAtMs !== undefined && event.capturedAtMs !== null) {
    const age = nowMs - event.capturedAtMs;
    return age > maxAgeMs;
  }
  const eventTime = event.timestamp;
  if (eventTime === undefined || eventTime === null) return false;
  const finalTime = eventTime < 10000000000 ? eventTime * 1000 : eventTime;
  const age = nowMs - finalTime;
  return age > maxAgeMs;
}

