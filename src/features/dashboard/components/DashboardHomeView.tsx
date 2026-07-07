import { Flame, Video } from 'lucide-react';
import { AiDangerPanel } from '../../../components/dashboard/AiDangerPanel';
import type { AiEvent } from '../../../hooks/useAiEvents';
import type { LiveCamera } from '../data/cameras';
import { LiveCameraGrid } from './LiveCameraGrid';
import type { CameraStatusMap } from '../hooks/useCameraStatusWebSocket';
import { aiEventFingerprint } from '../../../shared/utils/aiAlerts';

interface DashboardHomeViewProps {
  acknowledgedAiEventIds: ReadonlySet<string>;
  dangerAiEvents: readonly AiEvent[];
  overlayEvents: readonly AiEvent[];
  focusedLiveCameras: readonly LiveCamera[];
  onCameraSelect: (camera: LiveCamera) => void;
  onConfirmAiEvent: (event: AiEvent) => void;
  onEmergency: () => void;
  onFocusAiEvent: (event: AiEvent) => void;
  /** 실시간 카메라 연결 상태 맵 (MQTT → Backend → WebSocket) */
  cameraStatusMap?: CameraStatusMap;
}

export function DashboardHomeView({
  acknowledgedAiEventIds,
  dangerAiEvents,
  overlayEvents,
  focusedLiveCameras,
  onCameraSelect,
  onConfirmAiEvent,
  onEmergency,
  onFocusAiEvent,
  cameraStatusMap,
}: DashboardHomeViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto relative w-full pb-20">
      {/* 1. Camera Section */}
      <div className="w-full space-y-3 pb-4">
        <div className="flex justify-between items-center px-4 pt-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
            <Video className="w-4 h-4 text-blue-400" />
            실시간 모니터링
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              모니터링 중
            </span>
            <button
              onClick={onEmergency}
              className="text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-md shadow-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Flame className="w-3 h-3" />
              119 출동
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-4">
          <LiveCameraGrid
            cameras={[...focusedLiveCameras]}
            onCameraClick={onCameraSelect}
            cameraStatusMap={cameraStatusMap}
            overlayEvents={overlayEvents}
          />
        </div>
      </div>

      {/* 2. AI Events Section */}
      <div className="w-full px-4 pb-8 flex-col flex gap-2">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            실시간 AI 이벤트
          </h3>
        </div>
        
        <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
          <div className="p-2 sm:p-3">
            <AiDangerPanel
              events={dangerAiEvents.filter(event => !acknowledgedAiEventIds.has(aiEventFingerprint(event)))}
              acknowledgedEventIds={acknowledgedAiEventIds}
              onFocus={onFocusAiEvent}
              onConfirm={onConfirmAiEvent}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
