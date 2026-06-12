import { Radio, SignalZero, Video, X } from 'lucide-react';
import { streamRenderKind, type StreamRenderKind } from '../data/cameras';
import { CameraStreamFrame } from './CameraStreamFrame';

interface CCTVVideoPlayerProps {
  cameraName: string;
  location?: string;
  streamUrl?: string;
  streamKind?: StreamRenderKind;
  status?: 'online' | 'offline' | 'connecting';
  eventStatus?: 'normal' | 'warning' | 'danger';
  onClose: () => void;
}

export function CCTVVideoPlayer({
  cameraName,
  location,
  streamUrl,
  streamKind = streamRenderKind(),
  status = 'online',
  eventStatus = 'normal',
  onClose,
}: CCTVVideoPlayerProps) {
  const isOffline = status === 'offline' || !streamUrl;
  const eventLabel = eventStatus === 'danger' ? '이상 상황' : eventStatus === 'warning' ? '주의 필요' : '정상 모니터링';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-4 py-2 text-white backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Video className="h-4 w-4 flex-shrink-0 text-blue-400" />
          <span className="truncate text-sm font-medium">{cameraName}</span>
          {location && <span className="truncate text-xs text-slate-400">{location}</span>}
        </div>
        <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative aspect-video bg-black">
        {isOffline ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <SignalZero className="mx-auto mb-2 h-12 w-12 text-slate-700" />
              <p className="text-sm font-bold text-slate-500">연결 없음</p>
              <p className="mt-1 text-xs text-slate-700">{cameraName}</p>
            </div>
          </div>
        ) : (
          <CameraStreamFrame
            streamUrl={streamUrl}
            streamKind={streamKind}
            title={`${cameraName} live stream`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white backdrop-blur-sm">
          {new Date().toLocaleString('ko-KR')}
        </div>

        <div
          className={`absolute right-2 top-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm ${
            eventStatus === 'danger'
              ? 'bg-red-600/90'
              : eventStatus === 'warning'
                ? 'bg-amber-600/90'
                : 'bg-emerald-600/90'
          }`}
        >
          <Radio className="h-3 w-3" />
          {eventLabel}
        </div>
      </div>
    </div>
  );
}
