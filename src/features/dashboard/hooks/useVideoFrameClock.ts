import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface VideoFrameClock {
  readonly mediaTimeMs: number;
  readonly receivedAtMs: number;
  readonly presentedFrames?: number;
}

export function useVideoFrameClock(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  resetKey: string,
): VideoFrameClock | null {
  const [videoFrameClock, setVideoFrameClock] = useState<VideoFrameClock | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVideoFrameClock(null);
      return undefined;
    }
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }
    let active = true;
    let callbackId: number | null = null;
    let animationId: number | null = null;

    const setClock = (mediaTimeSeconds: number, presentedFrames?: number) => {
      if (!active) {
        return;
      }
      setVideoFrameClock({
        mediaTimeMs: Math.round(mediaTimeSeconds * 1000),
        receivedAtMs: Date.now(),
        presentedFrames,
      });
    };

    if (typeof video.requestVideoFrameCallback === 'function') {
      const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
        setClock(metadata.mediaTime, metadata.presentedFrames);
        callbackId = video.requestVideoFrameCallback(onFrame);
      };
      callbackId = video.requestVideoFrameCallback(onFrame);
      return () => {
        active = false;
        if (callbackId !== null && typeof video.cancelVideoFrameCallback === 'function') {
          video.cancelVideoFrameCallback(callbackId);
        }
      };
    }

    const onAnimationFrame = () => {
      setClock(video.currentTime);
      animationId = window.requestAnimationFrame(onAnimationFrame);
    };
    animationId = window.requestAnimationFrame(onAnimationFrame);
    return () => {
      active = false;
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
      }
    };
  }, [enabled, resetKey, videoRef]);

  return videoFrameClock;
}
