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
    <div className="flex-1 space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
            카메라 등록 및 관리
            {facilityName && (
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                연결됨 {facilityName}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-400">CCTV 연결 정보를 등록하고 관리합니다.</p>
        </div>
        {!readOnly && (
          <button
            onClick={onAddCamera}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> 카메라 추가
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#071329] p-5">
        <h3 className="mb-4 text-sm font-bold text-white">등록된 카메라</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {registeredCameras.map((camera) => {
            const liveFeed = liveFeedFor(camera, liveCameras);
            return (
              <div key={camera.id} className={`group overflow-hidden rounded-xl border border-slate-800 bg-[#111827] ${camera.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
                <div className="relative aspect-video">
                  <CameraStreamFrame
                    streamUrl={liveFeed?.streamUrl}
                    streamKind={liveFeed?.streamKind ?? 'mjpeg'}
                    title={camera.name}
                    className="h-full w-full object-cover brightness-75"
                    dimmed
                    cameraLoginId={liveFeed?.cameraLoginId}
                  />
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${camera.status === 'INACTIVE' ? 'bg-slate-500' : 'animate-ping bg-rose-500'}`} />
                    <span className={`text-[9px] font-bold ${camera.status === 'INACTIVE' ? 'text-slate-400' : 'text-rose-400'}`}>
                      {camera.status === 'INACTIVE' ? 'OFFLINE' : 'LIVE'}
                    </span>
                  </div>
                  {!readOnly && camera.status !== 'INACTIVE' && (
                    <button
                      onClick={() => onDeleteCamera(camera.id)}
                      className="absolute right-2 top-2 cursor-pointer rounded bg-slate-900/80 p-1 text-slate-400 opacity-0 hover:bg-red-600 hover:text-white group-hover:opacity-100"
                      title="비활성화"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="truncate text-sm font-bold text-white" title={camera.name}>{camera.name}</p>
                  <p className="truncate text-[10px] text-slate-400">{camera.location}</p>
                  {camera.password && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <KeyRound className="h-3 w-3 flex-shrink-0 text-slate-500" />
                      <span className="font-mono text-[11px] text-slate-400">
                        {showCamPwId === camera.id ? camera.password : '*'.repeat(8)}
                      </span>
                      <button
                        onClick={() => onTogglePassword(camera.id)}
                        className="ml-auto cursor-pointer text-slate-500 hover:text-slate-300"
                      >
                        {showCamPwId === camera.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!readOnly && Array.from({ length: Math.max(0, 6 - registeredCameras.length) }).map((_, index) => (
            <div
              key={`slot-${index}`}
              className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-[#111827] hover:border-slate-500 hover:bg-slate-800/30"
              onClick={onAddCamera}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d9d9d9]/10">
                <Plus className="h-7 w-7 text-slate-400" />
              </div>
              <span className="text-xs font-medium text-slate-500">카메라 추가</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
