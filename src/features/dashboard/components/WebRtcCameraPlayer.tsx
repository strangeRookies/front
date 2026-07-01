import { useEffect, useRef, useState } from 'react';
import { WEBRTC_BASE_URL, HLS_BASE_URL, STREAM_FALLBACK_ENABLED } from '../data/cameras';
import { HlsStream } from './CameraStreamFrame';

interface WebRtcCameraPlayerProps {
  readonly cameraLoginId: string;
  readonly title: string;
  readonly className?: string;
  readonly dimmed?: boolean;
}

type PlaybackMode = 'webrtc' | 'hls';
type PlaybackStatus = 'connecting' | 'webrtc-live' | 'hls-fallback' | 'failed';

export function WebRtcCameraPlayer({
  cameraLoginId,
  title,
  className = '',
  dimmed = false,
}: WebRtcCameraPlayerProps) {
  const [mode, setMode] = useState<PlaybackMode>('webrtc');
  const [playStatus, setPlayStatus] = useState<PlaybackStatus>('connecting');
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If not in WebRTC mode, do not run WebRTC setup
    if (mode !== 'webrtc') return undefined;

    let isMounted = true;
    const video = videoRef.current;
    if (!video) return undefined;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    let hasTrack = false;
    let hasPlayed = false;
    let lastDecodedFrames = 0;
    let decodedFramesStuckCount = 0;

    const triggerFallback = (reason: string) => {
      if (!isMounted) return;
      console.warn(`[WebRTC Player] Falling back to HLS for ${cameraLoginId}. Reason: ${reason}`);
      setFallbackReason(reason);
      cleanup();

      if (STREAM_FALLBACK_ENABLED) {
        setMode('hls');
        setPlayStatus('hls-fallback');
      } else {
        setPlayStatus('failed');
      }
    };

    const cleanup = () => {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {
          console.error('[WebRTC Player] Error closing peer connection:', e);
        }
        pcRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    // 1. Connection Timeout (5~8s)
    connectionTimeoutRef.current = setTimeout(() => {
      if (!hasPlayed && isMounted) {
        triggerFallback('WebRTC connection timeout (no frame played within 7s)');
      }
    }, 7000);

    // 2. Listen to ICE connection state
    pc.addEventListener('iceconnectionstatechange', () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC Player] ${cameraLoginId} ICE Connection State: ${state}`);
      if (state === 'failed' || state === 'disconnected') {
        triggerFallback(`ICE connection state failed or disconnected: ${state}`);
      }
    });

    // 3. Add video transceiver
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
    } catch (err: any) {
      console.error(`[WebRTC Player] Transceiver error:`, err);
    }

    // 4. Track event
    pc.ontrack = (event) => {
      console.log(`[WebRTC Player] ${cameraLoginId} received WebRTC track`);
      hasTrack = true;
      if (video && isMounted) {
        video.srcObject = event.streams[0];
        video.play().catch((err) => {
          console.error(`[WebRTC Player] Auto-play failed:`, err);
        });
      }
    };

    // 5. Video playing listener
    const handlePlaying = () => {
      if (!isMounted) return;
      hasPlayed = true;
      setPlayStatus('webrtc-live');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
    video.addEventListener('playing', handlePlaying);

    // 6. SDP / WHEP Negotiation
    const performWhepNegotiation = async () => {
      try {
        const offer = await pc.createOffer();
        if (!isMounted) return;
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering complete with 2s limit
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const check = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', check);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(() => {
              pc.removeEventListener('icegatheringstatechange', check);
              resolve();
            }, 2000);
          }
        });

        if (!isMounted) return;

        const whepUrl = `${WEBRTC_BASE_URL}/${cameraLoginId}/whep`;
        console.log(`[WebRTC Player] Connecting to WHEP URL: ${whepUrl}`);
        const res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription?.sdp,
        });

        if (!res.ok) {
          throw new Error(`WHEP POST request failed (HTTP ${res.status})`);
        }
        const answer = await res.text();
        if (!isMounted) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: answer });
        console.log(`[WebRTC Player] WHEP negotiation succeeded for ${cameraLoginId}`);
      } catch (err: any) {
        triggerFallback(`SDP / WHEP negotiation failed: ${err.message}`);
      }
    };

    void performWhepNegotiation();

    // 7. Stats check loop (every 1s) to monitor framesDecoded
    statsIntervalRef.current = setInterval(async () => {
      if (!isMounted || pc.signalingState === 'closed') return;
      try {
        const stats = await pc.getStats();
        let foundVideoStats = false;
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            foundVideoStats = true;
            const currentDecoded = report.framesDecoded || 0;
            if (hasPlayed) {
              if (currentDecoded === lastDecodedFrames) {
                decodedFramesStuckCount++;
                if (decodedFramesStuckCount >= 4) {
                  triggerFallback('WebRTC stream frozen (framesDecoded is not increasing)');
                }
              } else {
                decodedFramesStuckCount = 0;
              }
            }
            lastDecodedFrames = currentDecoded;
          }
        });

        if (!foundVideoStats && hasTrack && hasPlayed) {
          // If track/play started but stats went away, check if it's stuck
          decodedFramesStuckCount++;
          if (decodedFramesStuckCount >= 4) {
            triggerFallback('WebRTC stream inactive (no video stats reporting)');
          }
        }
      } catch (e) {
        // Ignore stats check errors
      }
    }, 1000);

    return () => {
      isMounted = false;
      video.removeEventListener('playing', handlePlaying);
      cleanup();
    };
  }, [cameraLoginId, mode]);

  // HLS 모드일 때 45초마다 WebRTC 복귀 가능한지 백그라운드 프로브
  useEffect(() => {
    if (mode !== 'hls') return undefined;

    const probe = () => {
      const tempPc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      let resolved = false;

      const cleanup = () => {
        try { tempPc.close(); } catch { /* ignore */ }
      };

      const timeout = setTimeout(() => {
        if (!resolved) cleanup();
      }, 6000);

      tempPc.ontrack = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        console.log(`[WebRTC Player] Background probe succeeded for ${cameraLoginId}, switching back to WebRTC`);
        setMode('webrtc');
        setPlayStatus('connecting');
        setFallbackReason(null);
      };

      (async () => {
        try {
          tempPc.addTransceiver('video', { direction: 'recvonly' });
          const offer = await tempPc.createOffer();
          await tempPc.setLocalDescription(offer);
          await new Promise<void>((resolve) => {
            if (tempPc.iceGatheringState === 'complete') { resolve(); return; }
            const check = () => {
              if (tempPc.iceGatheringState === 'complete') {
                tempPc.removeEventListener('icegatheringstatechange', check);
                resolve();
              }
            };
            tempPc.addEventListener('icegatheringstatechange', check);
            setTimeout(() => { tempPc.removeEventListener('icegatheringstatechange', check); resolve(); }, 2000);
          });
          const whepUrl = `${WEBRTC_BASE_URL}/${cameraLoginId}/whep`;
          const res = await fetch(whepUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: tempPc.localDescription?.sdp,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const answer = await res.text();
          await tempPc.setRemoteDescription({ type: 'answer', sdp: answer });
        } catch {
          if (!resolved) cleanup();
        }
      })();
    };

    const intervalId = setInterval(probe, 45000);
    return () => clearInterval(intervalId);
  }, [mode, cameraLoginId]);

  // Clean up if component unmounts
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
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
        {STREAM_FALLBACK_ENABLED && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded bg-amber-600/95 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur shadow leading-normal whitespace-normal z-10 animate-fade-in">
            <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-200" />
            <span>WebRTC 연결 실패로 HLS 예비 재생 중이며 영상 지연이 발생할 수 있음.</span>
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

      {/* Playback status overlay badges at the bottom-left of the camera frame */}
      {playStatus === 'connecting' && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-blue-600/90 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur shadow z-10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-200" />
          WebRTC 연결 중
        </div>
      )}

      {playStatus === 'webrtc-live' && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-emerald-600/95 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur shadow z-10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-200" />
          WebRTC 실시간 재생 중
        </div>
      )}

      {playStatus === 'failed' && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-red-600/90 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur shadow z-10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-200" />
          연결 실패 ({fallbackReason || 'WebRTC Error'})
        </div>
      )}
    </div>
  );
}
