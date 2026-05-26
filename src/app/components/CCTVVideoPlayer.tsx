import { Video, X } from 'lucide-react';

interface CCTVVideoPlayerProps {
  cameraName: string;
  onClose: () => void;
}

export function CCTVVideoPlayer({ cameraName, onClose }: CCTVVideoPlayerProps) {
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm text-white px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">{cameraName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative bg-black aspect-video">
        {/* 실제 CCTV 영상 대신 플레이스홀더 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Video className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">실시간 영상</p>
            <p className="text-slate-700 text-xs mt-1">{cameraName}</p>
          </div>
        </div>

        {/* 타임스탬프 오버레이 */}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-mono">
          {new Date().toLocaleString('ko-KR')}
        </div>

        {/* 녹화 인디케이터 */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-semibold">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          REC
        </div>
      </div>
    </div>
  );
}
