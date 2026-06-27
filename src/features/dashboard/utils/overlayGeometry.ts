import { z } from 'zod';
import type { AiEvent } from '../../../hooks/useAiEvents';

export interface OverlayBox {
  readonly leftPct: number;
  readonly topPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
}

const xywhSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const xyxySchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

const bboxArraySchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export function overlayBoxes(event: AiEvent): OverlayBox[] {
  const values: unknown[] = [event.bbox, ...event.boxes];
  return values
    .map((value) => parseOverlayBox(value, event.frameWidth, event.frameHeight))
    .filter((box): box is OverlayBox => box !== undefined);
}

export function parseOverlayBox(value: unknown, frameWidth?: number, frameHeight?: number): OverlayBox | undefined {
  const nested = readObjectValue(value, 'bbox') ?? readObjectValue(value, 'boundingBox') ?? value;
  const xywh = xywhSchema.safeParse(nested);
  if (xywh.success) {
    return normalizeXywh(xywh.data.x, xywh.data.y, xywh.data.width, xywh.data.height, frameWidth, frameHeight);
  }
  const xyxy = xyxySchema.safeParse(nested);
  if (xyxy.success) {
    return normalizeXyxy(xyxy.data.x1, xyxy.data.y1, xyxy.data.x2, xyxy.data.y2, frameWidth, frameHeight);
  }
  const bboxArray = bboxArraySchema.safeParse(nested);
  if (bboxArray.success) {
    return normalizeXyxy(bboxArray.data[0], bboxArray.data[1], bboxArray.data[2], bboxArray.data[3], frameWidth, frameHeight);
  }
  return undefined;
}

function normalizeXywh(x: number, y: number, width: number, height: number, frameWidth?: number, frameHeight?: number): OverlayBox {
  const scaleX = coordinateScale(frameWidth, x + width);
  const scaleY = coordinateScale(frameHeight, y + height);
  return {
    leftPct: clampPct((x / scaleX) * 100),
    topPct: clampPct((y / scaleY) * 100),
    widthPct: clampPct((width / scaleX) * 100),
    heightPct: clampPct((height / scaleY) * 100),
  };
}

function normalizeXyxy(x1: number, y1: number, x2: number, y2: number, frameWidth?: number, frameHeight?: number): OverlayBox {
  return normalizeXywh(x1, y1, Math.max(0, x2 - x1), Math.max(0, y2 - y1), frameWidth, frameHeight);
}

function coordinateScale(frameSize: number | undefined, maxValue: number): number {
  if (frameSize !== undefined && frameSize > 0 && maxValue > 1) {
    return frameSize;
  }
  return maxValue <= 1 ? 1 : Math.max(maxValue, 1);
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function readObjectValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(value, key) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
}
