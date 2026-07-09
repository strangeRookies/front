import { useEffect, useRef } from 'react';
import { ROI_GROUPS, deserializePolygon, type RoiConfigResponse } from '../api/roiApi';

interface RoiOverlayCanvasProps {
  readonly rois: RoiConfigResponse[];
}

const GROUP_COLORS: Record<string, { fill: string; stroke: string }> = {
  FAINT: { fill: 'rgba(34,211,238,0.16)', stroke: 'rgba(34,211,238,0.8)' },
  EXIT: { fill: 'rgba(251,146,60,0.16)', stroke: 'rgba(251,146,60,0.8)' },
  HAZARD: { fill: 'rgba(239,68,68,0.16)', stroke: 'rgba(239,68,68,0.8)' }, // Red
};

export function RoiOverlayCanvas({ rois }: RoiOverlayCanvasProps) {
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

      if (rois.length === 0) return;

      for (const group of ROI_GROUPS) {
        const types: readonly string[] = group.scenarioTypes;
        const roi = rois.find(r => types.includes(r.scenarioType));
        if (!roi) continue;
        const points = deserializePolygon(roi.polygonPoints);
        if (points.length < 3) continue;

        const colors = GROUP_COLORS[group.groupId] ?? GROUP_COLORS.FAINT;
        context.beginPath();
        context.moveTo(points[0].x * width, points[0].y * height);
        for (let i = 1; i < points.length; i++) {
          context.lineTo(points[i].x * width, points[i].y * height);
        }
        context.closePath();
        context.fillStyle = colors.fill;
        context.fill();
        context.strokeStyle = colors.stroke;
        context.lineWidth = 2;
        context.stroke();
      }
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [rois]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
