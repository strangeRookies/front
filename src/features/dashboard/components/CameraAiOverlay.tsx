import { useCameraOverlaySyncBuffer, useCameraFrameSyncBuffer } from '../overlays/overlayStore';
import type { VideoFrameClock } from '../hooks/useVideoFrameClock';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { overlayBoxes, parseOverlayBox, type OverlayBox } from '../utils/overlayGeometry';
import type { OverlayMessage } from '../overlays/overlayTypes';

interface CameraAiOverlayProps {
  readonly cameraLoginId?: string;
  readonly videoFrameClock?: VideoFrameClock | null;
  readonly event?: AiEvent;
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

  const boxes = matchedOverlay
    ? matchedOverlay.events
        .map((e) => parseOverlayBox(e.bbox, matchedOverlay!.frameWidth, matchedOverlay!.frameHeight))
        .filter((box): box is OverlayBox => box !== undefined)
        .slice(0, 8)
    : overlayBoxes(propEvent!).slice(0, 8);

  const activeFrameId = matchedOverlay ? matchedOverlay.frameId : (propEvent ? propEvent.frameId : undefined);
  const activeTimestamp = matchedOverlay ? matchedOverlay.timestampMs : (propEvent ? propEvent.timestamp : Date.now());

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {boxes.map((box, index) => (
        <div
          key={`${activeFrameId ?? activeTimestamp}-${index}`}
          className="absolute rounded-sm border-2 border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.45)]"
          style={{
            left: `${box.leftPct}%`,
            top: `${box.topPct}%`,
            width: `${box.widthPct}%`,
            height: `${box.heightPct}%`,
          }}
        />
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
