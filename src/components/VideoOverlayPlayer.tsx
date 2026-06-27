import React, { useRef, useEffect } from 'react';
import { useCctvStore, TelemetryEvent } from '../store/useCctvStore';

// AI 모델이 기준 삼은 원본 해상도 (팀 내 기준값으로 조정 필요)
const AI_ORIGINAL_WIDTH = 1280;
const AI_ORIGINAL_HEIGHT = 720;

interface VideoOverlayPlayerProps {
  streamUrl: string;
  // 추가: 외부(Custom Hook 등)에서 받아온 스트림 객체를 전달받기 위한 Props
  mediaStream?: MediaStream | null;
}

export const VideoOverlayPlayer: React.FC<VideoOverlayPlayerProps> = ({ streamUrl, mediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zustand 스토어에서 실시간 데이터 수신
  const telemetryData = useCctvStore((state) => state.telemetryData);

  // 캔버스 그리기 로직
  const drawOverlays = (ctx: CanvasRenderingContext2D, events: TelemetryEvent[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!events || events.length === 0) return;

    const canvasWidth = ctx.canvas.clientWidth;
    const canvasHeight = ctx.canvas.clientHeight;

    if (ctx.canvas.width !== canvasWidth || ctx.canvas.height !== canvasHeight) {
      ctx.canvas.width = canvasWidth;
      ctx.canvas.height = canvasHeight;
    }

    const scaleX = canvasWidth / AI_ORIGINAL_WIDTH;
    const scaleY = canvasHeight / AI_ORIGINAL_HEIGHT;

    events.forEach((event) => {
      if (event.type === 'faint') {
        const { boundingBox, memoText, confidence } = event;
        const { x, y, width, height } = boundingBox;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // [A] 바운딩 박스
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

        // [B] 텍스트 배경
        ctx.fillStyle = '#EF4444';
        const text = `${memoText} (${(confidence * 100).toFixed(0)}%)`;
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(scaledX - 1, scaledY - 25, textWidth + 10, 25);

        // [C] 텍스트
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, scaledX + 5, scaledY - 7);
      }
    });
  };

  // 1. telemetryData가 변경될 때마다 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawOverlays(ctx, telemetryData?.events || []);
  }, [telemetryData]);

  // 2. mediaStream이 들어오면 비디오 태그에 연결 (추가된 핵심 로직)
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <div className="relative w-full max-w-[1280px] mx-auto overflow-hidden rounded-lg bg-gray-900">
      {/* WebRTC 스트림 연결용 비디오 태그 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="block w-full h-auto"
      />
      
      {/* 메모 오버레이용 캔버스 */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      />

      {/* 로딩 표시 */}
      {!mediaStream && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-20">
          스트림 연결 대기 중...
        </div>
      )}
    </div>
  );
};