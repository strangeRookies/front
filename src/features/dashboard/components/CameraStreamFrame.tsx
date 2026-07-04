import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { STREAM_MODE, getMjpegUrlForCamera, type StreamRenderKind } from '../data/cameras';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { CameraAiOverlay } from './CameraAiOverlay';
import { WebRtcCameraPlayer } from './WebRtcCameraPlayer';

export interface CameraStreamFrameProps {
  readonly streamUrl?: string;
  readonly streamKind: StreamRenderKind;
  readonly title: string;
  readonly className?: string;
  readonly dimmed?: boolean;
  readonly cameraLoginId?: string;
  readonly overlayEvent?: AiEvent;
}

export function HlsStream({ streamUrl, title, className = '', dimmed = false }: CameraStreamFrameProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return undefined;

    // Safari 네이티브 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      const handleError = () => {
        setTimeout(() => {
          if (video) video.src = streamUrl;
        }, 3000);
      };
      video.addEventListener('error', handleError);
      return () => video.removeEventListener('error', handleError);
    }

    if (!Hls.isSupported()) return undefined;

    let hls = new Hls({ enableWorker: true, lowLatencyMode: true });

    const attach = () => {
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    };

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        hls.destroy();
        setTimeout(() => {
          hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls.on(Hls.Events.ERROR, () => {});
          attach();
        }, 3000);
      }
    });

    attach();
    return () => {
      hls.destroy();
    };
  }, [streamUrl]);

  return (
    <video
      ref={videoRef}
      title={title}
      className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''}`}
      muted
      playsInline
      autoPlay
      controls={false}
    />
  );
}

function extractCameraLoginId(urlStr?: string): string | undefined {
  if (!urlStr) return undefined;
  try {
    const url = new URL(urlStr);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'mjpeg' && pathParts[1]) {
      return pathParts[1];
    }
    if (pathParts.length > 0) {
      return pathParts[0]; // For /cam_01/index.m3u8 or /cam_01/whep
    }
  } catch {
    const mjpegMatch = urlStr.match(/\/mjpeg\/([^/]+)/);
    if (mjpegMatch) return mjpegMatch[1];
    const match = urlStr.match(/\/([^/]+)\/(index\.m3u8|whep)/);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * MJPEG 스트림을 <img> 태그로 표시하는 컴포넌트.
 * STREAM_MODE=mjpeg 일 때 AI worker가 overlay를 JPEG 프레임에 직접 그려 보내므로
 * 프론트에서 별도 bbox/ROI/keypoint overlay를 그리지 않는다.
 */
function MjpegStream({
  cameraLoginId,
  title,
  className = '',
  dimmed = false,
}: {
  cameraLoginId: string;
  title: string;
  className?: string;
  dimmed?: boolean;
}) {
  const mjpegUrl = getMjpegUrlForCamera(cameraLoginId);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // cameraLoginId가 바뀌면 상태 초기화
  useEffect(() => {
    setLoadError(undefined);
    setLoaded(false);
  }, [cameraLoginId]);

  if (loadError) {
    return (
      <div
        className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} flex flex-col items-center justify-center gap-1.5 bg-slate-950 px-4 text-center`}
      >
        <span className="text-[10px] font-bold text-rose-400">MJPEG stream not ready</span>
        <span className="break-all text-[9px] text-slate-500">{cameraLoginId}</span>
        <span className="break-all text-[9px] text-slate-600">{mjpegUrl}</span>
        <span className="text-[9px] text-slate-600">{loadError}</span>
      </div>
    );
  }

  return (
    <div className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} relative`}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-950 text-center">
          <span className="text-[10px] font-bold text-slate-400">연결 중...</span>
          <span className="text-[9px] text-slate-600">{cameraLoginId}</span>
        </div>
      )}
      <img
        src={mjpegUrl}
        alt={title}
        className={`h-full w-full object-cover ${loaded ? '' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoadError(`HTTP load error — ${mjpegUrl}`);
        }}
      />
    </div>
  );
}

export function CameraStreamFrame({
  streamUrl,
  streamKind,
  title,
  className = '',
  dimmed = false,
  cameraLoginId,
  overlayEvent,
}: CameraStreamFrameProps) {
  const derivedLoginId = cameraLoginId || extractCameraLoginId(streamUrl);

  // ─── MJPEG 모드 ─────────────────────────────────────────────────────────────
  // AI worker가 JPEG 프레임에 overlay를 직접 그려 보내므로 프론트에서 별도 overlay를 렌더링하지 않는다.
  if (streamKind === 'mjpeg') {
    if (!derivedLoginId) {
      return (
        <div
          className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} flex items-center justify-center bg-slate-950 text-sm text-slate-400`}
        >
          카메라 ID를 확인할 수 없습니다.
        </div>
      );
    }
    return (
      <MjpegStream
        cameraLoginId={derivedLoginId}
        title={title}
        className={className}
        dimmed={dimmed}
      />
    );
  }

  // ─── HLS / WebRTC 모드 ──────────────────────────────────────────────────────
  if (!streamUrl) return null;

  if (STREAM_MODE === 'webrtc' && derivedLoginId) {
    return (
      <WebRtcCameraPlayer
        cameraLoginId={derivedLoginId}
        title={title}
        className={className}
        dimmed={dimmed}
        overlayEvent={overlayEvent}
      />
    );
  }

  return (
    <div className={className}>
      <HlsStream
        streamUrl={streamUrl}
        streamKind={streamKind}
        title={title}
        className="h-full w-full object-cover"
        dimmed={dimmed}
      />
      <CameraAiOverlay cameraLoginId={derivedLoginId} event={overlayEvent} />
    </div>
  );
}
