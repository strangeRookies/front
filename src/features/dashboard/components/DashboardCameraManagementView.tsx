import { Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { LiveCamera } from '../data/cameras';
import type { RegisteredCamera } from '../types/dashboard';
interface DashboardCameraManagementViewProps {
  liveCameras: readonly LiveCamera[];
  registeredCameras: readonly RegisteredCamera[];
  showCamPwId: string | null;
  facilityName?: string;
  facilityId?: number;
  onAddCamera: () => void;
  onDeleteCamera: (cameraId: string) => void;
  onTogglePassword: (cameraId: string) => void;
}

export function DashboardCameraManagementView({
  liveCameras,
  registeredCameras,
  showCamPwId,
  facilityName,
  facilityId,
  onAddCamera,
  onDeleteCamera,
  onTogglePassword,
}: DashboardCameraManagementViewProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            카메라 등록 및 관리
            {facilityName && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                연결됨: {facilityName}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">CCTV 연결 정보를 등록하고 관리합니다.</p>
        </div>
...
        <button
          onClick={onAddCamera}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> 카메라 추가
        </button>
      </div>

      <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">등록된 카메라</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {registeredCameras.map((camera) => (
            <div key={camera.id} className={`bg-[#111827] border border-slate-800 rounded-xl overflow-hidden group ${camera.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              <div className="relative aspect-video">
                <img
                  src={liveCameras.find((feed) => feed.name === camera.id || feed.location === camera.location)?.streamUrl || liveCameras[0]?.streamUrl}
                  alt={camera.name}
                  className="w-full h-full object-cover opacity-75 brightness-75"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${camera.status === 'INACTIVE' ? 'bg-slate-500' : 'bg-rose-500 animate-ping'}`} />
                  <span className={`text-[9px] font-bold ${camera.status === 'INACTIVE' ? 'text-slate-400' : 'text-rose-400'}`}>
                    {camera.status === 'INACTIVE' ? 'OFFLINE' : 'LIVE'}
                  </span>
                </div>
                {camera.status !== 'INACTIVE' && (
                  <button
                    onClick={() => onDeleteCamera(camera.id)}
                    className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-red-600 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="비활성화"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-white font-bold text-sm truncate" title={camera.name}>{camera.name}</p>
                <p className="text-slate-400 text-[10px] truncate">{camera.location}</p>
                {camera.password && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <KeyRound className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="text-[11px] font-mono text-slate-400">
                      {showCamPwId === camera.id ? camera.password : '•'.repeat(8)}
                    </span>
                    <button
                      onClick={() => onTogglePassword(camera.id)}
                      className="ml-auto text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showCamPwId === camera.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 6 - registeredCameras.length) }).map((_, index) => (
            <div
              key={`slot-${index}`}
              className="bg-[#111827] border border-dashed border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-800/30"
              onClick={onAddCamera}
            >
              <div className="w-14 h-14 rounded-full bg-[#d9d9d9]/10 flex items-center justify-center">
                <Plus className="w-7 h-7 text-slate-400" />
              </div>
              <span className="text-slate-500 text-xs font-medium">카메라 추가</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
