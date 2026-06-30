export interface OverlayBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface OverlayEvent {
  readonly type: string;
  readonly confidence: number | null;
  readonly trackingId: string | number | null;
  readonly bbox: OverlayBox;
  readonly eventTriggered?: boolean;
}

export interface OverlayMessage {
  readonly schemaVersion: string;
  readonly messageType: 'overlay' | 'frame_sync';
  readonly timestampMs: number;
  readonly cameraLoginId: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly events: readonly OverlayEvent[];
  readonly frameId?: number;
  readonly capturedAtMs?: number;
  readonly processedAtMs?: number;
  readonly publishedAtMs?: number;
  readonly queueLagMs?: number;
  readonly droppedFrameCount?: number;
  readonly receivedAtMs?: number;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBox(value: unknown): OverlayBox | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const x = readNumber(record.x);
  const y = readNumber(record.y);
  const width = readNumber(record.width);
  const height = readNumber(record.height);

  if (x === null || y === null || width === null || height === null) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function clampBox(box: OverlayBox, frameWidth: number, frameHeight: number): OverlayBox | null {
  const left = Math.max(0, Math.min(frameWidth, box.x));
  const top = Math.max(0, Math.min(frameHeight, box.y));
  const right = Math.max(0, Math.min(frameWidth, box.x + box.width));
  const bottom = Math.max(0, Math.min(frameHeight, box.y + box.height));
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x: left, y: top, width, height };
}

export function parseOverlayMessage(raw: unknown): OverlayMessage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const messageType = record.messageType;
  if (messageType !== 'overlay' && messageType !== 'frame_sync') {
    return null;
  }

  const cameraLoginId = readString(record.cameraLoginId) ?? readString(record.streamId);
  const frameWidth = readNumber(record.frameWidth) ?? 0;
  const frameHeight = readNumber(record.frameHeight) ?? 0;
  const timestampMs = readNumber(record.timestampMs) ?? Date.now();
  const eventsRaw = record.events;

  if (!cameraLoginId) {
    return null;
  }

  const events: OverlayEvent[] = [];
  if (Array.isArray(eventsRaw)) {
    eventsRaw.forEach((eventRaw) => {
      if (!eventRaw || typeof eventRaw !== 'object' || Array.isArray(eventRaw)) {
        return;
      }

      const event = eventRaw as Record<string, unknown>;
      const box = readBox(event.bbox) ?? readBox(event.boundingBox);
      if (!box) {
        return;
      }

      const clampedBox = clampBox(box, frameWidth || 1920, frameHeight || 1080);
      if (!clampedBox) {
        return;
      }

      events.push({
        type: readString(event.type) ?? 'unknown',
        confidence: readNumber(event.confidence),
        trackingId:
          typeof event.trackingId === 'number' || typeof event.trackingId === 'string'
            ? event.trackingId
            : null,
        bbox: clampedBox,
        eventTriggered: typeof event.eventTriggered === 'boolean' ? event.eventTriggered : undefined,
      });
    });
  }

  return {
    schemaVersion: readString(record.schemaVersion) ?? '1.0',
    messageType: messageType as 'overlay' | 'frame_sync',
    timestampMs,
    cameraLoginId,
    frameWidth,
    frameHeight,
    events,
    frameId: readNumber(record.frameId) ?? undefined,
    capturedAtMs: readNumber(record.capturedAtMs) ?? undefined,
    processedAtMs: readNumber(record.processedAtMs) ?? undefined,
    publishedAtMs: readNumber(record.publishedAtMs) ?? undefined,
    queueLagMs: readNumber(record.queueLagMs) ?? undefined,
    droppedFrameCount: readNumber(record.droppedFrameCount) ?? undefined,
    receivedAtMs: Date.now(),
  };
}
