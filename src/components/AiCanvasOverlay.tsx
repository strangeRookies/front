import React, { useRef, useEffect } from 'react';
import { useCctvStore } from '../store/useCctvStore';

interface AiCanvasOverlayProps {
  cameraId: string; 
}

export const AiCanvasOverlay: React.FC<AiCanvasOverlayProps> = ({ cameraId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 상태 관리 구조 변경에 따라 내 카메라 아이디(cameraId)로 데이터를 쏙 빼옵니다.
  const telemetryData = useCctvStore((state) => state.telemetryDataMap[cameraId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 매 렌더링마다 이전 그림 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 데이터가 없으면 바로 종료하여 아래 로직의 타입 에러를 방지합니다.
    if (!telemetryData) return;

    const events = telemetryData.events || [];
    if (events.length === 0) return;

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // 반응형 해상도 동기화
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    // 동적 스케일링 계산
    const aiWidth = telemetryData.frameWidth || 1280; 
    const aiHeight = telemetryData.frameHeight || 720;

    const scaleX = canvasWidth / aiWidth;
    const scaleY = canvasHeight / aiHeight;

    events.forEach((event) => {
      if (event.type === 'faint') {
        const { boundingBox, memoText, confidence, trackingId } = event;
        const { x, y, width, height } = boundingBox;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // [바운딩 박스 그리기]
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

        // [텍스트 라벨 그리기]
        ctx.fillStyle = '#EF4444';
        const idText = trackingId ? `[ID:${trackingId}] ` : '';
        const text = `${idText}${memoText} (${(confidence * 100).toFixed(0)}%)`;
        
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(scaledX - 1, scaledY - 25, textWidth + 10, 25);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, scaledX + 5, scaledY - 7);
      }
    });
  }, [telemetryData, cameraId]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none z-10"
    />
  );
};