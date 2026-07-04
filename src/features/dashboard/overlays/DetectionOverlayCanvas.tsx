import { useEffect, useRef } from 'react';
import type { OverlayMessage, OverlayEvent } from './overlayTypes';
import {
  resolveOverlayBoxDisplay,
  FAINT_DISPLAY_THRESHOLD,
  normalizeConfidence,
} from '../utils/overlayGeometry';

interface DetectionOverlayCanvasProps {
  readonly message?: OverlayMessage;
}

function formatType(type: string) {
  const upper = type.trim().toUpperCase();
  if (upper === 'FALL' || upper === 'FALL_DETECTED') return 'FALL_DETECTED';
  if (upper === 'FAINT') return 'FAINT';
  return upper || 'UNKNOWN';
}

export function getDisplayLabel(event: OverlayEvent): string {
  if (event.displayLabel) return event.displayLabel;

  const displayId = event.displayId ?? event.display_id;
  if (displayId !== undefined && displayId !== null) {
    return `ID ${displayId}`;
  }

  const rawId = event.trackId ?? event.trackingId ?? event.track_id;
  return rawId !== undefined && rawId !== null ? `ID ${rawId}` : 'ID ?';
}

export function composeOverlayLabel(event: OverlayEvent, index: number): string {
  const display = resolveOverlayBoxDisplay(event, index);
  const idLabel = getDisplayLabel(event);

  if (idLabel === 'ID ?') {
    return display.label;
  }

  return display.label === idLabel ? idLabel : `${idLabel} ${display.label}`;
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  maxWidth: number,
  bgColor: string,
  textColor: string,
) {
  context.font = '700 12px sans-serif';
  const metrics = context.measureText(label);
  const paddingX = 8;
  const labelWidth = Math.min(metrics.width + paddingX * 2, maxWidth);
  const labelHeight = 24;
  const labelX = Math.max(0, Math.min(x, maxWidth - labelWidth));
  const labelY = Math.max(0, y - labelHeight - 4);

  context.fillStyle = bgColor;
  context.fillRect(labelX, labelY, labelWidth, labelHeight);
  context.fillStyle = textColor;
  context.fillText(label, labelX + paddingX, labelY + 16, labelWidth - paddingX * 2);
}

export function DetectionOverlayCanvas({ message }: DetectionOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      if (!message || message.events.length === 0) return;

      if (import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true') {
        const sourcePath = 'matchedOverlay';
        message.events.forEach((event, idx) => {
          const display = resolveOverlayBoxDisplay(event, idx);
          const rawConfidence = event.confidence ?? 0;
          const normalizedConfidence = normalizeConfidence(rawConfidence);
          const trackId = event.trackingId ?? 'n/a';
          const rawType = event.type ?? 'unknown';

          console.log(
            `[Overlay Diagnosis Debug] cameraLoginId: ${message.cameraLoginId ?? 'n/a'}, sourcePath: ${sourcePath}, ` +
            `trackId: ${trackId}, raw confidence: ${rawConfidence}, normalized confidence: ${normalizedConfidence}, ` +
            `threshold: ${FAINT_DISPLAY_THRESHOLD}, raw type: ${rawType}, ` +
            `final variant: ${display.variant}, final label: ${display.label}`
          );
        });
      }

      const scale = Math.max(width / message.frameWidth, height / message.frameHeight);
      const renderedWidth = message.frameWidth * scale;
      const renderedHeight = message.frameHeight * scale;
      const offsetX = (width - renderedWidth) / 2;
      const offsetY = (height - renderedHeight) / 2;

      for (let idx = 0; idx < message.events.length; idx++) {
        const event = message.events[idx];
        const left = offsetX + event.bbox.x * scale;
        const top = offsetY + event.bbox.y * scale;
        const boxWidth = event.bbox.width * scale;
        const boxHeight = event.bbox.height * scale;

        const display = resolveOverlayBoxDisplay(event, idx);
        const isEvent = display.variant === 'event';

        context.lineWidth = 3;
        context.strokeStyle = isEvent ? '#f43f5e' : '#38bdf8';
        context.shadowColor = isEvent ? 'rgba(244, 63, 94, 0.7)' : 'rgba(56, 189, 248, 0.4)';
        context.shadowBlur = 12;
        context.strokeRect(left, top, boxWidth, boxHeight);
        context.shadowBlur = 0;

        context.fillStyle = isEvent ? 'rgba(244, 63, 94, 0.08)' : 'rgba(56, 189, 248, 0.04)';
        context.fillRect(left, top, boxWidth, boxHeight);

        const bgColor = isEvent ? 'rgba(225, 29, 72, 0.92)' : 'rgba(56, 189, 248, 0.92)';
        const textColor = isEvent ? '#ffffff' : '#0f172a';
        const finalLabel = composeOverlayLabel(event, idx);
        drawLabel(context, finalLabel, left, top, width, bgColor, textColor);
      }
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [message]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden="true"
    />
  );
}
