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
  readonly messageType: 'overlay';
  readonly timestampMs: number;
  readonly cameraLoginId: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly events: readonly OverlayEvent[];
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
  if (record.messageType !== 'overlay') {
    return null;
  }

  const cameraLoginId = readString(record.cameraLoginId) ?? readString(record.streamId);
  const frameWidth = readNumber(record.frameWidth);
  const frameHeight = readNumber(record.frameHeight);
  const timestampMs = readNumber(record.timestampMs) ?? Date.now();
  const eventsRaw = record.events;

  if (!cameraLoginId || frameWidth === null || frameHeight === null || !Array.isArray(eventsRaw)) {
    return null;
  }
  if (frameWidth <= 0 || frameHeight <= 0) {
    return null;
  }

  const events = eventsRaw
    .map((eventRaw): OverlayEvent | null => {
      if (!eventRaw || typeof eventRaw !== 'object' || Array.isArray(eventRaw)) {
        return null;
      }

      const event = eventRaw as Record<string, unknown>;
      const box = readBox(event.bbox) ?? readBox(event.boundingBox);
      if (!box) {
        return null;
      }

      const clampedBox = clampBox(box, frameWidth, frameHeight);
      if (!clampedBox) {
        return null;
      }

      return {
        type: readString(event.type) ?? 'unknown',
        confidence: readNumber(event.confidence),
        trackingId:
          typeof event.trackingId === 'number' || typeof event.trackingId === 'string'
            ? event.trackingId
            : null,
        bbox: clampedBox,
        eventTriggered: typeof event.eventTriggered === 'boolean' ? event.eventTriggered : false,
      };
    })
    .filter((event): event is OverlayEvent => event !== null);

  if (eventsRaw.length > 0 && events.length === 0) {
    return null;
  }

  return {
    schemaVersion: readString(record.schemaVersion) ?? '1.0',
    messageType: 'overlay',
    timestampMs,
    cameraLoginId,
    frameWidth,
    frameHeight,
    events,
  };
}
