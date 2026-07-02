import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { STREAM_MODE, type StreamRenderKind } from '../data/cameras';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { CameraAiOverlay } from './CameraAiOverlay';
import { WebRtcCameraPlayer } from './WebRtcCameraPlayer';
import { fetchAiOverlay, startAiOverlay, type AiOverlayResponse, type AiOverlayStatus } from '../../../app/api/cameraApi';

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
    if (pathParts.length > 0) {
      return pathParts[0]; // For /cam_01/index.m3u8 or /cam_01/whep
    }
  } catch {
    const match = urlStr.match(/\/([^/]+)\/(index\.m3u8|whep)/);
    if (match) return match[1];
  }
  return undefined;
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
  const shouldResolveOverlay = streamKind === 'mjpeg' && STREAM_MODE === 'overlay' && !!derivedLoginId;
  const [overlayUrl, setOverlayUrl] = useState<string | undefined>(undefined);
  const [overlayStatus, setOverlayStatus] = useState<AiOverlayStatus>('UNKNOWN');
  const [overlayError, setOverlayError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!shouldResolveOverlay || !derivedLoginId) {
      setOverlayUrl(undefined);
      setOverlayStatus('UNKNOWN');
      setOverlayError(undefined);
      return undefined;
    }

    let cancelled = false;
    let retryTimer: number | undefined;

    const applyResponse = (response: AiOverlayResponse): boolean => {
      if (cancelled) {
        return false;
      }
      setOverlayStatus(response.status);
      setOverlayError(undefined);
      if (response.status === 'RUNNING' && response.overlayUrl) {
        setOverlayUrl(response.overlayUrl);
        return true;
      }
      setOverlayUrl(undefined);
      return false;
    };

    const loadOverlay = async (attempt: number): Promise<void> => {
      try {
        const response = attempt === 0
          ? await startAiOverlay(derivedLoginId)
          : await fetchAiOverlay(derivedLoginId);
        const resolved = applyResponse(response);
        if (resolved || cancelled || (response.status !== 'STARTING' && response.status !== 'UNKNOWN')) {
          return;
        }
        if (attempt >= 20) {
          setOverlayStatus('ERROR');
          setOverlayError('AI overlay stream is still starting. Check the AI runner for this camera.');
          return;
        }
        if (!resolved && !cancelled) {
          retryTimer = window.setTimeout(() => {
            void loadOverlay(attempt + 1);
          }, 1000);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setOverlayStatus('ERROR');
        setOverlayError(error instanceof Error ? error.message : 'AI overlay stream request failed.');
        setOverlayUrl(undefined);
      }
    };

    void loadOverlay(0);
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [derivedLoginId, shouldResolveOverlay]);

  if (streamKind === 'hls') {
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

  const resolvedStreamUrl = shouldResolveOverlay ? overlayUrl : streamUrl;
  if (!resolvedStreamUrl) {
    return (
      <div
        className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''} flex items-center justify-center bg-slate-950 text-sm text-slate-300`}
      >
        {overlayError || (overlayStatus === 'ERROR' ? 'AI overlay stream unavailable.' : 'AI overlay starting...')}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={resolvedStreamUrl}
        alt={title}
        className={`h-full w-full object-cover ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''}`}
      />
      <CameraAiOverlay cameraLoginId={derivedLoginId} event={overlayEvent} />
    </div>
  );
}
