import { useEffect, useRef } from 'react';
import type { OverlayMessage } from './overlayTypes';

interface DetectionOverlayCanvasProps {
  readonly message?: OverlayMessage;
}

function formatType(type: string) {
  const upper = type.trim().toUpperCase();
  if (upper === 'FALL' || upper === 'FALL_DETECTED') return 'FALL_DETECTED';
  if (upper === 'FAINT') return 'FAINT';
  return upper || 'UNKNOWN';
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  maxWidth: number,
  bgColor: string,
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
  context.fillStyle = '#ffffff';
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

      const scale = Math.max(width / message.frameWidth, height / message.frameHeight);
      const renderedWidth = message.frameWidth * scale;
      const renderedHeight = message.frameHeight * scale;
      const offsetX = (width - renderedWidth) / 2;
      const offsetY = (height - renderedHeight) / 2;

      for (const event of message.events) {
        const isDanger = !!event.eventTriggered;
        const strokeColor = isDanger ? '#fb7185' : '#10b981'; // 빨강 vs 초록
        const shadowColor = isDanger ? 'rgba(251, 113, 133, 0.7)' : 'rgba(16, 185, 129, 0.5)';
        const fillColor = isDanger ? 'rgba(251, 113, 133, 0.12)' : 'rgba(16, 185, 129, 0.08)';
        const labelBgColor = isDanger ? 'rgba(225, 29, 72, 0.92)' : 'rgba(16, 185, 129, 0.92)';
        const left = offsetX + event.bbox.x * scale;
        const top = offsetY + event.bbox.y * scale;
        const boxWidth = event.bbox.width * scale;
        const boxHeight = event.bbox.height * scale;

        context.lineWidth = 3;
        context.strokeStyle = strokeColor;
        context.shadowColor = shadowColor;
        context.shadowBlur = 12;
        context.strokeRect(left, top, boxWidth, boxHeight);
        context.shadowBlur = 0;

        context.fillStyle = fillColor;
        context.fillRect(left, top, boxWidth, boxHeight);

        const confidence = event.confidence === null ? '' : ` ${Math.round(event.confidence * 100)}%`;
        drawLabel(context, `${formatType(event.type)}${confidence}`, left, top, width, labelBgColor);
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
