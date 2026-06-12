import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { StreamRenderKind } from '../data/cameras';

interface CameraStreamFrameProps {
  readonly streamUrl?: string;
  readonly streamKind: StreamRenderKind;
  readonly title: string;
  readonly className?: string;
  readonly dimmed?: boolean;
}

function HlsStream({ streamUrl, title, className = '', dimmed = false }: CameraStreamFrameProps) {
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

export function CameraStreamFrame({
  streamUrl,
  streamKind,
  title,
  className = '',
  dimmed = false,
}: CameraStreamFrameProps) {
  if (!streamUrl) return null;

  if (streamKind === 'hls') {
    return <HlsStream streamUrl={streamUrl} streamKind={streamKind} title={title} className={className} dimmed={dimmed} />;
  }

  return (
    <img
      src={streamUrl}
      alt={title}
      className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''}`}
    />
  );
}
