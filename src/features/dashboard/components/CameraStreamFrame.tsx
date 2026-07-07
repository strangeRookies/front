import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { STREAM_MODE, type StreamRenderKind } from '../data/cameras';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { CameraAiOverlay } from './CameraAiOverlay';
import { WebRtcCameraPlayer } from './WebRtcCameraPlayer';
import {
  MJPEG_STALE_POLL_THRESHOLD,
  classifyHealthFetchError,
  reconnectCooldownMs,
  staleReasonsForPayload,
  type MjpegHealthCounters,
  type MjpegHealthErrorReason,
  type MjpegStaleReason,
} from '../utils/mjpegStaleDetector';

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

function withCacheBuster(url: string, cacheBuster: number): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${cacheBuster}`;
}

/**
 * MJPEG 스트림을 <img> 태그로 표시하는 컴포넌트.
 * STREAM_MODE=mjpeg 일 때 AI worker가 overlay를 JPEG 프레임에 직접 그려 보내므로
 * 프론트에서 별도 bbox/ROI/keypoint overlay를 그리지 않는다.
 */
function MjpegStream({
  cameraLoginId,
  streamUrl,
  title,
  className = '',
  dimmed = false,
}: {
  cameraLoginId?: string;
  streamUrl: string;
  title: string;
  className?: string;
  dimmed?: boolean;
}) {
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const mjpegUrl = withCacheBuster(streamUrl, cacheBuster);
  const cameraLabel = cameraLoginId ?? extractCameraLoginId(streamUrl) ?? 'unknown-camera';
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [diagInfo, setDiagInfo] = useState<{
    complete: boolean;
    naturalWidth: number;
    naturalHeight: number;
    lastErrorTime?: string;
    lastHealthFrameAge: number;
    isStale: boolean;
    processedFrames: number;
    mjpegFrames: number;
    streamClients: number;
    staleReasons: readonly MjpegStaleReason[];
    reconnectAttempt: number;
    diagnosticUnavailable: boolean;
    healthError?: string;
    healthErrorReason?: MjpegHealthErrorReason;
  }>({
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    lastHealthFrameAge: -1,
    isStale: false,
    processedFrames: 0,
    mjpegFrames: 0,
    streamClients: 0,
    staleReasons: [],
    reconnectAttempt: 0,
    diagnosticUnavailable: false,
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const previousHealthRef = useRef<MjpegHealthCounters | undefined>(undefined);
  const consecutivePayloadStaleRef = useRef(0);
  const lastReconnectAtRef = useRef(0);
  const reconnectAttemptRef = useRef(0);

  // cameraLoginId가 바뀌면 상태 초기화 및 캐시 버스터 갱신
  useEffect(() => {
    setLoadError(undefined);
    setLoaded(false);
    setCacheBuster(Date.now());
    setDiagInfo({
      complete: false,
      naturalWidth: 0,
      naturalHeight: 0,
      lastHealthFrameAge: -1,
      isStale: false,
      processedFrames: 0,
      mjpegFrames: 0,
      streamClients: 0,
      staleReasons: [],
      reconnectAttempt: 0,
      diagnosticUnavailable: false,
    });
    previousHealthRef.current = undefined;
    consecutivePayloadStaleRef.current = 0;
    lastReconnectAtRef.current = 0;
    reconnectAttemptRef.current = 0;
  }, [cameraLoginId, streamUrl]);

  let expectedPort = 'unknown';
  let healthUrl = '';
  try {
    const parsedUrl = new URL(mjpegUrl);
    expectedPort = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
    healthUrl = `${parsedUrl.protocol}//${parsedUrl.host}/health`;
  } catch {
    expectedPort = 'invalid';
  }

  // Polling health endpoint to detect stream stale state
  useEffect(() => {
    if (!healthUrl) {
      setDiagInfo(prev => ({
        ...prev,
        diagnosticUnavailable: true,
        healthError: 'Invalid health URL',
        healthErrorReason: 'health-url-invalid',
        isStale: false,
      }));
      console.warn(`[mjpeg-health] Camera ${cameraLabel} diagnostic unavailable reason=health-url-invalid`);
      return undefined;
    }

    const interval = setInterval(async () => {
      let complete = false;
      let width = 0;
      let height = 0;
      if (imgRef.current) {
        complete = imgRef.current.complete;
        width = imgRef.current.naturalWidth;
        height = imgRef.current.naturalHeight;
      }

      try {
        const res = await fetch(healthUrl, { cache: 'no-store' });
        if (!res.ok) {
          consecutivePayloadStaleRef.current = 0;
          setDiagInfo(prev => ({
            ...prev,
            complete,
            naturalWidth: width,
            naturalHeight: height,
            diagnosticUnavailable: true,
            healthError: `HTTP ${res.status}`,
            healthErrorReason: 'health-fetch-failed',
            isStale: false,
            staleReasons: [],
          }));
          console.warn(`[mjpeg-health] Camera ${cameraLabel} diagnostic unavailable reason=health-fetch-failed status=${res.status}`);
          return;
        }
        const data = await res.json();

        const frameAge = Number(data.frame_age_ms ?? data.last_frame_age_ms ?? -1);
        const processed = Number(data.processed_frame_count ?? 0);
        const mjpeg = Number(data.mjpeg_frame_count ?? 0);
        const streamClients = Number(data.stream_clients ?? data.mjpeg_client_count ?? data.summary?.mjpeg_client_count ?? 0);
        const staleReasons = staleReasonsForPayload(
          frameAge,
          processed,
          mjpeg,
          streamClients,
          previousHealthRef.current,
        );
        const isStaleNow = staleReasons.length === 3;
        previousHealthRef.current = { processedFrames: processed, mjpegFrames: mjpeg };
        consecutivePayloadStaleRef.current = isStaleNow ? consecutivePayloadStaleRef.current + 1 : 0;

        setDiagInfo(prev => ({
          ...prev,
          complete,
          naturalWidth: width,
          naturalHeight: height,
          lastHealthFrameAge: frameAge,
          processedFrames: processed,
          mjpegFrames: mjpeg,
          streamClients,
          staleReasons,
          reconnectAttempt: reconnectAttemptRef.current,
          diagnosticUnavailable: false,
          isStale: isStaleNow,
          healthError: undefined,
          healthErrorReason: undefined,
        }));

        if (consecutivePayloadStaleRef.current < MJPEG_STALE_POLL_THRESHOLD) {
          return;
        }

        const now = Date.now();
        const cooldownMs = reconnectCooldownMs(reconnectAttemptRef.current);
        if (now - lastReconnectAtRef.current < cooldownMs) {
          console.warn(`[mjpeg-stale] Camera ${cameraLabel} reconnect skipped reason=reconnect-cooldown-active cooldownMs=${cooldownMs}`);
          setDiagInfo(prev => ({
            ...prev,
            healthErrorReason: 'reconnect-cooldown-active',
          }));
          return;
        }

        console.warn(`[mjpeg-stale] Camera ${cameraLabel} stale detected reason=${staleReasons.join(',')} Auto-reconnecting...`);
        lastReconnectAtRef.current = now;
        reconnectAttemptRef.current += 1;
        setCacheBuster(now);
        consecutivePayloadStaleRef.current = 0;
      } catch (err: unknown) {
        const reason = classifyHealthFetchError(err);
        const message = err instanceof Error ? err.message : 'fetch failed';
        consecutivePayloadStaleRef.current = 0;
        setDiagInfo(prev => ({
          ...prev,
          complete,
          naturalWidth: width,
          naturalHeight: height,
          healthError: message,
          healthErrorReason: reason,
          diagnosticUnavailable: true,
          isStale: false,
          staleReasons: [],
        }));
        console.warn(`[mjpeg-health] Camera ${cameraLabel} diagnostic unavailable reason=${reason} message=${message}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cameraLabel, healthUrl]);

  const handleReconnect = () => {
    const now = Date.now();
    setCacheBuster(now);
    lastReconnectAtRef.current = now;
    reconnectAttemptRef.current = 0;
    consecutivePayloadStaleRef.current = 0;
    setDiagInfo(prev => ({
      ...prev,
      isStale: false,
      staleReasons: [],
      reconnectAttempt: 0,
      lastHealthFrameAge: 0,
      diagnosticUnavailable: false,
    }));
  };

  if (loadError) {
    return (
      <div
        className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} flex flex-col items-center justify-center gap-1.5 bg-slate-950 px-4 text-center`}
      >
        <span className="text-[10px] font-bold text-rose-400">MJPEG stream not ready</span>
        <span className="break-all text-[9px] text-slate-500">Camera: {cameraLabel}</span>
        <span className="break-all text-[9px] text-slate-600">URL: {mjpegUrl}</span>
        <span className="text-[9px] text-slate-600">Expected Port: {expectedPort}</span>
        <span className="text-[9px] text-rose-500">{loadError}</span>
        {diagInfo.lastErrorTime && (
          <span className="text-[8px] text-slate-500">Error Time: {diagInfo.lastErrorTime}</span>
        )}
        <button
          onClick={handleReconnect}
          className="mt-2 rounded bg-slate-800 px-2 py-1 text-[9px] text-slate-200 hover:bg-slate-700"
        >
          재연결 (Reconnect)
        </button>
      </div>
    );
  }

  return (
    <div className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} relative group`}>
      {(!loaded || diagInfo.isStale) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-950/80 text-center z-10">
          <span className="text-[10px] font-bold text-slate-400">
            {diagInfo.isStale ? '영상 지연 발생 (Stale)' : '연결 중...'}
          </span>
          <span className="text-[9px] text-slate-600">
            {cameraLabel} {diagInfo.lastHealthFrameAge > 0 && `(Age: ${diagInfo.lastHealthFrameAge}ms)`}
          </span>
          <button
            onClick={handleReconnect}
            className="mt-1 rounded bg-slate-800 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-700"
          >
            재연결
          </button>
        </div>
      )}
      <img
        ref={imgRef}
        src={mjpegUrl}
        alt={title}
        className={`h-full w-full object-cover ${loaded ? '' : 'opacity-0'}`}
        onLoad={() => {
          setLoaded(true);
          if (imgRef.current) {
            setDiagInfo(prev => ({
              ...prev,
              complete: imgRef.current?.complete ?? false,
              naturalWidth: imgRef.current?.naturalWidth ?? 0,
              naturalHeight: imgRef.current?.naturalHeight ?? 0,
            }));
          }
        }}
        onError={() => {
          const nowStr = new Date().toLocaleTimeString();
          setLoadError(`HTTP load error — code 404/500 or network issue`);
          setDiagInfo(prev => ({
            ...prev,
            lastErrorTime: nowStr,
          }));
        }}
      />
      {/* Mini Diagnostic HUD overlay (visible on hover) */}
      <div className="absolute bottom-1 left-1 bg-slate-950/70 p-1 text-[8px] text-slate-400 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div>URL: {mjpegUrl}</div>
        <div>Mode: MJPEG | Port: {expectedPort}</div>
        <div>Size: {diagInfo.naturalWidth}x{diagInfo.naturalHeight}</div>
        <div>Age: {diagInfo.lastHealthFrameAge}ms {diagInfo.isStale ? '(STALE)' : ''}</div>
        <div>Frames: processed={diagInfo.processedFrames} mjpeg={diagInfo.mjpegFrames}</div>
        <div>Clients: {diagInfo.streamClients} | Reconnects: {diagInfo.reconnectAttempt}</div>
        {diagInfo.staleReasons.length > 0 && <div>Reasons: {diagInfo.staleReasons.join(',')}</div>}
        {diagInfo.healthErrorReason && <div className="text-amber-300">Reason: {diagInfo.healthErrorReason}</div>}
        {diagInfo.healthError && <div className="text-rose-400">Err: {diagInfo.healthError}</div>}
      </div>
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
    if (!streamUrl) {
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
        streamUrl={streamUrl}
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
