import { useEffect, useRef, useState } from 'react';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { HLS_BASE_URL, STREAM_FALLBACK_ENABLED, WEBRTC_BASE_URL } from '../data/cameras';
import { useVideoFrameClock } from '../hooks/useVideoFrameClock';
import { CameraAiOverlay } from './CameraAiOverlay';
import { HlsStream } from './CameraStreamFrame';
import { WebRtcStatusBadges } from './WebRtcStatusBadges';

interface WebRtcCameraPlayerProps {
  readonly cameraLoginId: string;
  readonly title: string;
  readonly className?: string;
  readonly dimmed?: boolean;
  readonly overlayEvent?: AiEvent;
}

type PlaybackMode = 'webrtc' | 'hls';
type PlaybackStatus = 'connecting' | 'webrtc-live' | 'hls-fallback' | 'failed';

export function WebRtcCameraPlayer({
  cameraLoginId,
  title,
  className = '',
  dimmed = false,
  overlayEvent,
}: WebRtcCameraPlayerProps) {
  const [mode, setMode] = useState<PlaybackMode>('webrtc');
  const [playStatus, setPlayStatus] = useState<PlaybackStatus>('connecting');
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const overlaySyncDebug = import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true';
  const videoFrameClock = useVideoFrameClock(videoRef, overlaySyncDebug && mode === 'webrtc', cameraLoginId);

  useEffect(() => {
    if (mode !== 'webrtc') return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    let isMounted = true;
    let hasTrack = false;
    let hasPlayed = false;
    let iceConnected = false;
    let lastDecodedFrames = 0;
    let decodedFramesStuckCount = 0;
    let iceDisconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;

    const cleanup = () => {
      pcRef.current?.close();
      pcRef.current = null;
      if (statsIntervalRef.current !== null) {
        window.clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (connectionTimeoutRef.current !== null) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    const triggerFallback = (reason: string) => {
      if (!isMounted) return;
      console.warn(`[WebRTC Player] Falling back to HLS for ${cameraLoginId}. Reason: ${reason}`);
      setFallbackReason(reason);
      cleanup();
      if (STREAM_FALLBACK_ENABLED) {
        setMode('hls');
        setPlayStatus('hls-fallback');
        return;
      }
      setPlayStatus('failed');
    };

    connectionTimeoutRef.current = window.setTimeout(() => {
      if (!hasPlayed && isMounted) {
        triggerFallback('WebRTC connection timeout (no frame played within 7s)');
      }
    }, 7000);
    const iceTimeoutId = setTimeout(() => {
      if (!iceConnected && isMounted) {
        triggerFallback('WebRTC ICE timeout (no ICE connection within 15s)');
      }
    }, 15000);

    pc.addEventListener('iceconnectionstatechange', () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC Player] ${cameraLoginId} ICE Connection State: ${state}`);
      if (state === 'connected' || state === 'completed') {
        iceConnected = true;
        decodedFramesStuckCount = 0;
        if (iceDisconnectTimeout) { clearTimeout(iceDisconnectTimeout); iceDisconnectTimeout = null; }
      } else if (state === 'disconnected') {
        // UDP 후보 실패로 인한 일시적 disconnected — 5초 유예 후 복구 안 되면 폴백
        iceDisconnectTimeout = setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' && isMounted) {
            triggerFallback('ICE connection: disconnected (no recovery within 5s)');
          }
        }, 5000);
      } else if (state === 'failed') {
        triggerFallback('ICE connection state: failed');
      }
    });

    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[WebRTC Player] Transceiver error: ${error.message}`);
      } else {
        throw error;
      }
    }

    pc.ontrack = (event) => {
      console.log(`[WebRTC Player] ${cameraLoginId} received WebRTC track`);
      hasTrack = true;
      if (!isMounted) return;
      video.srcObject = event.streams[0] ?? null;
      void video.play().catch((error) => {
        if (error instanceof Error) {
          console.error(`[WebRTC Player] Auto-play failed: ${error.message}`);
          return;
        }
        throw error;
      });
    };

    const handlePlaying = () => {
      if (!isMounted) return;
      hasPlayed = true;
      setPlayStatus('webrtc-live');
      if (connectionTimeoutRef.current !== null) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
    video.addEventListener('playing', handlePlaying);

    const performWhepNegotiation = async () => {
      try {
        const offer = await pc.createOffer();
        if (!isMounted) return;
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);
        if (!isMounted) return;
        const whepUrl = `${WEBRTC_BASE_URL}/${cameraLoginId}/whep`;
        console.log(`[WebRTC Player] Connecting to WHEP URL: ${whepUrl}`);
        const response = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription?.sdp,
        });
        if (!response.ok) {
          triggerFallback(`WHEP POST request failed (HTTP ${response.status})`);
          return;
        }
        const answer = await response.text();
        if (!isMounted) return;
        // UDP 후보 제거 — SSH 터널 환경에서 UDP ICE는 응답 없이 in-progress만 쌓임
        const answerSdp = answer.split('\n').filter(line =>
          !line.startsWith('a=candidate:') || line.toLowerCase().includes(' tcp ')
        ).join('\n');
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        console.log(`[WebRTC Player] WHEP negotiation succeeded for ${cameraLoginId}`);
      } catch (error) {
        if (error instanceof Error) {
          triggerFallback(`SDP / WHEP negotiation failed: ${error.message}`);
          return;
        }
        throw error;
      }
    };

    void performWhepNegotiation();
    statsIntervalRef.current = window.setInterval(async () => {
      if (!isMounted || pc.signalingState === 'closed') return;
      const stats = await pc.getStats();
      let foundVideoStats = false;
      stats.forEach((report) => {
        if (readStringProperty(report, 'type') !== 'inbound-rtp' || readStringProperty(report, 'kind') !== 'video') return;
        foundVideoStats = true;
        const currentDecoded = readNumberProperty(report, 'framesDecoded') ?? 0;
        if (hasPlayed && currentDecoded === lastDecodedFrames) {
          decodedFramesStuckCount += 1;
          if (decodedFramesStuckCount >= 4) triggerFallback('WebRTC stream frozen (framesDecoded is not increasing)');
        } else {
          decodedFramesStuckCount = 0;
        }
        lastDecodedFrames = currentDecoded;
      });
      if (!foundVideoStats && hasTrack && hasPlayed) {
        decodedFramesStuckCount += 1;
        if (decodedFramesStuckCount >= 4) triggerFallback('WebRTC stream inactive (no video stats reporting)');
      }
    }, 1000);

    return () => {
      isMounted = false;
      video.removeEventListener('playing', handlePlaying);
      cleanup();
    };
  }, [cameraLoginId, mode]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      if (statsIntervalRef.current !== null) window.clearInterval(statsIntervalRef.current);
      if (connectionTimeoutRef.current !== null) window.clearTimeout(connectionTimeoutRef.current);
    };
  }, []);

  if (mode === 'hls') {
    const fallbackHlsUrl = `${HLS_BASE_URL}/${cameraLoginId}/index.m3u8`;
    return (
      <div className="relative h-full w-full">
        <HlsStream
          streamUrl={fallbackHlsUrl}
          streamKind="hls"
          title={title}
          className={className}
          dimmed={dimmed}
        />
        {/* <CameraAiOverlay event={overlayEvent} /> */}
        <CameraAiOverlay cameraLoginId={cameraLoginId} videoFrameClock={videoFrameClock} event={overlayEvent} videoRef={videoRef} />
        {STREAM_FALLBACK_ENABLED && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded bg-amber-600/95 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur shadow leading-normal whitespace-normal z-10 animate-fade-in">
            <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-200" />
            <span>WebRTC 연결 실패로 HLS 예비 재생 중입니다.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        title={title}
        className={`${className} ${dimmed ? 'opacity-25 grayscale pointer-events-none' : ''}`}
        muted
        playsInline
        autoPlay
        controls={false}
      />
      <WebRtcStatusBadges
        playStatus={playStatus}
        fallbackReason={fallbackReason}
        overlaySyncDebug={overlaySyncDebug}
        videoFrameClock={videoFrameClock}
      />
      {/* <CameraAiOverlay event={overlayEvent} /> */}
      <CameraAiOverlay cameraLoginId={cameraLoginId} videoFrameClock={videoFrameClock} event={overlayEvent} videoRef={videoRef} />
    </div>
  );
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, 2000);
    const check = () => {
      if (pc.iceGatheringState !== 'complete') return;
      window.clearTimeout(timeoutId);
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    pc.addEventListener('icegatheringstatechange', check);
  });
}

function readStringProperty(value: object, key: string): string | undefined {
  const property = Object.getOwnPropertyDescriptor(value, key)?.value;
  return typeof property === 'string' ? property : undefined;
}

function readNumberProperty(value: object, key: string): number | undefined {
  const property = Object.getOwnPropertyDescriptor(value, key)?.value;
  return typeof property === 'number' ? property : undefined;
}
