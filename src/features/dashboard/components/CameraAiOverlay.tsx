import { useCameraOverlaySyncBuffer, useCameraFrameSyncBuffer } from '../overlays/overlayStore';
import type { VideoFrameClock } from '../hooks/useVideoFrameClock';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { overlayBoxes, parseOverlayBox, type OverlayBox, resolveOverlayBoxDisplay } from '../utils/overlayGeometry';
import type { OverlayMessage } from '../overlays/overlayTypes';
import { overlayMetrics } from '../utils/overlayMetrics';


interface CameraAiOverlayProps {
  readonly cameraLoginId?: string;
  readonly videoFrameClock?: VideoFrameClock | null;
  readonly event?: AiEvent;
  readonly videoRef?: React.RefObject<HTMLVideoElement | null>;
}


const PLAYBACK_LATENCY_OFFSET_MS = 350;

export function CameraAiOverlay({ cameraLoginId, videoFrameClock, event: propEvent }: CameraAiOverlayProps) {
  const overlayBuffer = useCameraOverlaySyncBuffer(cameraLoginId ?? '');
  const frameSyncBuffer = useCameraFrameSyncBuffer(cameraLoginId ?? '');

  let matchedOverlay: OverlayMessage | undefined = undefined;
  let debugInfo: {
    frameId: string | number;
    capturedAtMs: string | number;
    deltaMs: number;
    e2eMs: number;
    netMs: number;
    bufferSize: number;
    droppedFrames: number;
    queueLagMs: number;
  } | null = null;

  if (cameraLoginId) {
    const now = Date.now();
    const targetCapturedAt = now - PLAYBACK_LATENCY_OFFSET_MS;

    if (overlayBuffer.length > 0) {
      let closest: OverlayMessage | undefined = undefined;
      let minDiff = Infinity;
      for (const msg of overlayBuffer) {
        if (!msg.capturedAtMs) continue;
        const diff = Math.abs(msg.capturedAtMs - targetCapturedAt);
        if (diff < minDiff) {
          minDiff = diff;
          closest = msg;
        }
      }

      if (minDiff < 500) {
        matchedOverlay = closest;
      }
    }

    const overlaySyncDebug = import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true';
    if (overlaySyncDebug) {
      const latestFrameSync = frameSyncBuffer[frameSyncBuffer.length - 1];
      
      const frameId = matchedOverlay?.frameId ?? latestFrameSync?.frameId ?? 'n/a';
      const capturedAt = matchedOverlay?.capturedAtMs ?? latestFrameSync?.capturedAtMs ?? 'n/a';
      const droppedFrames = latestFrameSync?.droppedFrameCount ?? 0;
      const queueLagMs = latestFrameSync?.queueLagMs ?? 0;

      const deltaMs = matchedOverlay?.capturedAtMs ? now - matchedOverlay.capturedAtMs : 0;
      const e2eMs = matchedOverlay?.publishedAtMs ? now - matchedOverlay.publishedAtMs : 0;
      const netMs = matchedOverlay?.publishedAtMs && matchedOverlay?.timestampMs ? matchedOverlay.timestampMs - matchedOverlay.publishedAtMs : 0;

      debugInfo = {
        frameId,
        capturedAtMs: capturedAt,
        deltaMs,
        e2eMs,
        netMs,
        bufferSize: overlayBuffer.length,
        droppedFrames,
        queueLagMs,
      };
    }
  }

  const activeEvent = matchedOverlay || propEvent;
  if (!activeEvent) {
    return null;
  }

  const now = Date.now();

  const boxes = matchedOverlay
    ? matchedOverlay.events
        .map((e, idx) => {
          const geometry = parseOverlayBox(e.bbox, matchedOverlay!.frameWidth, matchedOverlay!.frameHeight);
          if (!geometry) return undefined;
          const display = resolveOverlayBoxDisplay(e, idx);
          if (display.variant !== 'event') return undefined;
          return { ...geometry, label: display.label, isEvent: display.variant === 'event', fallbackIdUsed: display.fallbackIdUsed };
        })
        .filter((b): b is OverlayBox & { label: string; isEvent: boolean; fallbackIdUsed: boolean } => b !== undefined)
        .slice(0, 8)
    : [];

  const activeFrameId = matchedOverlay ? matchedOverlay.frameId : (propEvent ? propEvent.frameId : undefined);
  const activeTimestamp = matchedOverlay ? matchedOverlay.timestampMs : (propEvent ? propEvent.timestamp : now);

  // Quantitative metrics record
  const _fallbackIdCount = boxes.filter(b => b.fallbackIdUsed).length;
  const _eventBboxCount = boxes.filter(b => b.isEvent).length;
  const _overlayAge = matchedOverlay ? now - (matchedOverlay.capturedAtMs ?? now) : 0;
  overlayMetrics.record({
    cameraLoginId: cameraLoginId ?? 'unknown',
    selectedFrameId: activeFrameId,
    selectedTimestampMs: activeTimestamp,
    sourcePath: matchedOverlay ? 'matchedOverlay' : propEvent ? 'propEvent' : 'none',
    bboxCount: boxes.length,
    fallbackIdCount: _fallbackIdCount,
    eventBboxCount: _eventBboxCount,
    selectedDeltaMs: matchedOverlay?.capturedAtMs ? now - matchedOverlay.capturedAtMs : 0,
    overlayAgeMs: _overlayAge,
    wasStaleSkipped: !activeEvent,
  });


  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {boxes.map((box, index) => (
        <div
          key={`${activeFrameId ?? activeTimestamp}-${index}`}
          className={`absolute rounded-sm border-2 shadow-[0_0_18px_rgba(244,63,94,0.45)] ${box.isEvent ? 'border-rose-400' : 'border-sky-400'}`}
          style={{
            left: `${box.leftPct}%`,
            top: `${box.topPct}%`,
            width: `${box.widthPct}%`,
            height: `${box.heightPct}%`,
          }}
        >
          <span className={`absolute -top-5 left-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none ${box.isEvent ? 'bg-rose-500 text-white' : 'bg-sky-600 text-white'}`}>
            {box.label}
          </span>
        </div>
      ))}
      {debugInfo && (
        <div className="absolute bottom-2 right-2 max-w-[70%] rounded bg-black/75 px-2 py-1 text-[9px] font-semibold leading-snug text-white shadow">
          frame {debugInfo.frameId} · captured {debugInfo.capturedAtMs} · delta {debugInfo.deltaMs}ms
          <br />
          e2e {debugInfo.e2eMs}ms · net {debugInfo.netMs}ms · buffer {debugInfo.bufferSize} · queueLag {debugInfo.queueLagMs}ms · dropped {debugInfo.droppedFrames}
        </div>
      )}
      {!debugInfo && import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true' && propEvent && (
        <div className="absolute bottom-2 right-2 max-w-[70%] rounded bg-black/75 px-2 py-1 text-[9px] font-semibold leading-snug text-white shadow">
          frame {propEvent.frameId ?? 'n/a'} · captured {propEvent.capturedAtMs ?? 'n/a'} · delta {propEvent.overlayTimestampDeltaMs ?? 'n/a'}ms
          <br />
          e2e {propEvent.endToEndLatencyMs ?? 'n/a'}ms · net {propEvent.networkLatencyMs ?? 'n/a'}ms · buffer {propEvent.overlayBufferSize ?? 'n/a'}
        </div>
      )}
    </div>
  );
}
