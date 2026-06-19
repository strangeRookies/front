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

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return undefined;
    }

    if (!Hls.isSupported()) return undefined;

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
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
