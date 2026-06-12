import { Pause, Play, Volume2 } from 'lucide-react';
import { CameraStreamFrame } from '../components/CameraStreamFrame';
import { streamRenderKind, type StreamRenderKind } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';

interface IncidentPlaybackModalProps {
  incident: IncidentAlert;
  isPlaying: boolean;
  playbackProgress: number;
  playbackStreamUrl?: string;
  playbackStreamKind?: StreamRenderKind;
  onClose: () => void;
  onPlaybackProgressChange: (value: number) => void;
  onTogglePlaying: () => void;
}

export function IncidentPlaybackModal({
  incident,
  isPlaying,
  playbackProgress,
  playbackStreamUrl,
  playbackStreamKind = streamRenderKind(),
  onClose,
  onPlaybackProgressChange,
  onTogglePlaying,
}: IncidentPlaybackModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#071329] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#061224] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            <h3 className="text-sm font-extrabold text-white">이벤트 영상 확인</h3>
            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {incident.camera} / {incident.time}
            </span>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded border border-slate-800 bg-[#020817] px-2 py-1 text-xs font-bold text-slate-400 hover:text-white">닫기</button>
        </div>
        <div className="relative aspect-video overflow-hidden bg-black">
          <CameraStreamFrame
            streamUrl={playbackStreamUrl}
            streamKind={playbackStreamKind}
            title="incident playback stream"
            className="h-full w-full object-cover contrast-125 brightness-75"
          />
          <div className="absolute left-1/3 top-1/3 flex h-1/3 w-1/3 flex-col justify-between rounded border-2 border-rose-500 bg-rose-500/5 p-2">
            <span className="self-start rounded bg-rose-600 px-1.5 text-[9px] font-bold uppercase text-white">{incident.type}</span>
            <span className="animate-pulse text-center text-[10px] font-extrabold text-rose-400">{incident.label}</span>
          </div>
        </div>
        <div className="space-y-3 bg-[#061224] p-4">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>00:{playbackProgress.toString().padStart(2, '0')}</span>
              <span className="font-bold text-rose-400">이벤트 시점 (00:30)</span>
              <span>01:00</span>
            </div>
            <div className="relative pt-1">
              <input type="range" min="0" max="60" value={playbackProgress} onChange={(event) => onPlaybackProgressChange(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500" />
              <div className="absolute left-1/2 top-1 h-2.5 w-2 -translate-x-1/2 rounded-full border border-white bg-rose-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onTogglePlaying} className="cursor-pointer rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <div className="flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-slate-400" />
                <span className="text-[10px] text-slate-500">오디오</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
