import { Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { LiveCamera } from '../data/cameras';
import type { RegisteredCamera } from '../types/dashboard';
import { CameraStreamFrame } from './CameraStreamFrame';

interface DashboardCameraManagementViewProps {
  liveCameras: readonly LiveCamera[];
  registeredCameras: readonly RegisteredCamera[];
  showCamPwId: string | null;
  facilityName?: string;
  facilityId?: number;
  onAddCamera: () => void;
  onDeleteCamera: (cameraId: string) => void;
  onTogglePassword: (cameraId: string) => void;
  readOnly?: boolean;
}

function liveFeedFor(camera: RegisteredCamera, liveCameras: readonly LiveCamera[]) {
  return liveCameras.find((feed) => feed.cameraDbId === camera.id || feed.id === camera.id || feed.location === camera.location) ?? liveCameras[0];
}

export function DashboardCameraManagementView({
  liveCameras,
  registeredCameras,
  showCamPwId,
  facilityName,
  onAddCamera,
  onDeleteCamera,
  onTogglePassword,
  readOnly = false,
}: DashboardCameraManagementViewProps) {
  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 w-full">
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="flex flex-col gap-1.5 text-base font-extrabold text-white">
            카메라 등록/관리
            {facilityName && (
              <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                {facilityName}
              </span>
            )}
          </h2>
          <p className="mt-1.5 text-[10px] text-slate-400">현재 등록된 기기 수: {registeredCameras.length}대</p>
        </div>
        {!readOnly && (
          <button
            onClick={onAddCamera}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-[11px] font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-1"
          >
            <Plus className="h-3.5 w-3.5" /> 추가하기
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 pb-10">
        {registeredCameras.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-[#071329]/50 border border-dashed border-slate-800 rounded-2xl">
             <p className="text-xs text-slate-500 font-medium">등록된 카메라가 없습니다.</p>
          </div>
        ) : (
          registeredCameras.map((camera) => {
            const liveFeed = liveFeedFor(camera, liveCameras);
            return (
              <div key={camera.id} className={`overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1224] shadow-md flex flex-col ${camera.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                <div className="relative aspect-video bg-black w-full">
                  <CameraStreamFrame
                    streamUrl={liveFeed?.streamUrl}
                    streamKind={liveFeed?.streamKind ?? 'mjpeg'}
                    title={camera.name}
                    className="h-full w-full object-cover brightness-90"
                    dimmed
                    cameraLoginId={liveFeed?.cameraLoginId}
                  />
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
                    <span className={`h-1.5 w-1.5 rounded-full ${camera.status === 'INACTIVE' ? 'bg-slate-500' : 'animate-ping bg-rose-500'}`} />
                    <span className={`text-[9px] font-bold ${camera.status === 'INACTIVE' ? 'text-slate-400' : 'text-rose-400'}`}>
                      {camera.status === 'INACTIVE' ? 'OFFLINE' : 'LIVE'}
                    </span>
                  </div>
                  {!readOnly && camera.status !== 'INACTIVE' && (
                    <button
                      onClick={() => onDeleteCamera(camera.id)}
                      className="absolute right-2.5 top-2.5 cursor-pointer rounded-full bg-slate-900/80 p-2 text-slate-400 shadow-lg backdrop-blur-md hover:bg-rose-600 hover:text-white transition-colors active:scale-95"
                      title="비활성화"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-extrabold text-white leading-tight">{camera.name}</p>
                      <p className="truncate text-[11px] text-slate-400 mt-0.5">{camera.location}</p>
                    </div>
                  </div>
                  {camera.password && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/50">
                      <div className="flex items-center gap-1.5 flex-1 mt-1">
                        <KeyRound className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                        <span className="font-mono text-[12px] text-slate-300 font-medium bg-slate-900/50 px-2 py-0.5 rounded">
                          {showCamPwId === camera.id ? camera.password : '••••••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => onTogglePassword(camera.id)}
                        className="cursor-pointer text-slate-400 hover:text-slate-200 mt-1 bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors active:bg-slate-700"
                      >
                        {showCamPwId === camera.id ? '숨기기' : '비번 보기'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
