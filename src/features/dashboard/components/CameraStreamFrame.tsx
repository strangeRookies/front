import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { STREAM_MODE, type StreamRenderKind } from '../data/cameras';
import { WebRtcCameraPlayer } from './WebRtcCameraPlayer';

export interface CameraStreamFrameProps {
  readonly streamUrl?: string;
  readonly streamKind: StreamRenderKind;
  readonly title: string;
  readonly className?: string;
  readonly dimmed?: boolean;
  readonly cameraLoginId?: string;
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
}: CameraStreamFrameProps) {
  if (!streamUrl) return null;

  const derivedLoginId = cameraLoginId || extractCameraLoginId(streamUrl);

  if (streamKind === 'hls') {
    if (STREAM_MODE === 'webrtc' && derivedLoginId) {
      return (
        <WebRtcCameraPlayer
          cameraLoginId={derivedLoginId}
          title={title}
          className={className}
          dimmed={dimmed}
        />
      );
    }
    return (
      <HlsStream
        streamUrl={streamUrl}
        streamKind={streamKind}
        title={title}
        className={className}
        dimmed={dimmed}
      />
    );
  }

  return (
    <img
      src={streamUrl}
      alt={title}
      className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''}`}
    />
  );
}
