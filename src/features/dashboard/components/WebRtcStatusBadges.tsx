import type { VideoFrameClock } from '../hooks/useVideoFrameClock';

type PlaybackStatus = 'connecting' | 'webrtc-live' | 'hls-fallback' | 'failed';

interface WebRtcStatusBadgesProps {
  readonly playStatus: PlaybackStatus;
  readonly fallbackReason: string | null;
  readonly overlaySyncDebug: boolean;
  readonly videoFrameClock: VideoFrameClock | null;
}

export function WebRtcStatusBadges({
  playStatus,
  fallbackReason,
  overlaySyncDebug,
  videoFrameClock,
}: WebRtcStatusBadgesProps) {
  return (
    <>
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
      {overlaySyncDebug && videoFrameClock && (
        <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[9px] font-semibold text-white shadow z-10">
          video {videoFrameClock.mediaTimeMs}ms · recv {videoFrameClock.receivedAtMs}
          {videoFrameClock.presentedFrames !== undefined ? ` · frame ${videoFrameClock.presentedFrames}` : ''}
        </div>
      )}
    </>
  );
}
