import type { AiEvent } from '../../../hooks/useAiEvents';
import { overlayBoxes } from '../utils/overlayGeometry';

interface CameraAiOverlayProps {
  readonly event?: AiEvent;
}

export function CameraAiOverlay({ event }: CameraAiOverlayProps) {
  if (!event) {
    return null;
  }

  const boxes = overlayBoxes(event).slice(0, 8);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {boxes.map((box, index) => (
        <div
          key={`${event.frameId ?? event.timestamp}-${index}`}
          className="absolute rounded-sm border-2 border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.45)]"
          style={{
            left: `${box.leftPct}%`,
            top: `${box.topPct}%`,
            width: `${box.widthPct}%`,
            height: `${box.heightPct}%`,
          }}
        />
      ))}
      {import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true' && (
        <div className="absolute bottom-2 right-2 max-w-[70%] rounded bg-black/75 px-2 py-1 text-[9px] font-semibold leading-snug text-white shadow">
          frame {event.frameId ?? 'n/a'} · captured {event.capturedAtMs ?? 'n/a'} · delta {event.overlayTimestampDeltaMs ?? 'n/a'}ms
          <br />
          e2e {event.endToEndLatencyMs ?? 'n/a'}ms · net {event.networkLatencyMs ?? 'n/a'}ms · buffer {event.overlayBufferSize ?? 'n/a'}
        </div>
      )}
    </div>
  );
}
