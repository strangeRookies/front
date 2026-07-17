import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { AlertCircle, AlertTriangle, Expand, Eye, EyeOff, RefreshCw, ScanLine, Signal, SignalZero, Video, WifiOff } from 'lucide-react';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { findCameraForAiEvent } from '../../../shared/utils/aiAlerts';
import type { LiveCamera } from '../data/cameras';
import { useFullscreenCamera } from '../hooks/useFullscreenCamera';
import type { CameraConnectionStatus, CameraStatusMap } from '../hooks/useCameraStatusWebSocket';
import { toCameraConnectionStatusDisplay } from '../hooks/useCameraStatusWebSocket';
import { RoiOverlayCanvas } from '../overlays/RoiOverlayCanvas';
import { CameraStreamFrame } from './CameraStreamFrame';
import { RoiEditorModal } from './RoiEditorModal';
import { ROI_GROUPS, fetchRoiConfigs, type RoiConfigResponse } from '../api/roiApi';

interface LiveCameraGridProps {
  cameras: LiveCamera[];
  className?: string;
  compact?: boolean;
  onCameraClick?: (camera: LiveCamera) => void;
  cameraStatusMap?: CameraStatusMap;
  overlayEvents?: readonly AiEvent[];
}

function realtimeStatusIcon(status: CameraConnectionStatus) {
  switch (status) {
    case 'CONNECTED':
      return Signal;
    case 'DISCONNECTED':
      return WifiOff;
    case 'RECONNECTING':
      return RefreshCw;
    case 'ERROR':
      return AlertCircle;
    case 'DISABLED':
      return EyeOff;
    case 'UNKNOWN':
      return Signal;
  }
}

function statusStyle(camera: LiveCamera, realtimeStatus?: CameraConnectionStatus) {
  if (realtimeStatus && realtimeStatus !== 'UNKNOWN') {
    const display = toCameraConnectionStatusDisplay(realtimeStatus);
    return {
      border: display.border,
      badge: display.badge,
      dot: display.dot,
      label: display.label,
      icon: realtimeStatusIcon(realtimeStatus),
    };
  }
  if (camera.connectionStatus === 'offline') {
    return {
      border: 'border-slate-700',
      badge: 'bg-slate-700/80 text-slate-200 border-slate-600',
      dot: 'bg-slate-400',
      label: '연결 없음',
      icon: SignalZero,
    };
  }
  if (camera.connectionStatus === 'connecting') {
    return {
      border: 'border-amber-500/60',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      dot: 'bg-amber-400 animate-pulse',
      label: '연결 확인 중',
      icon: Signal,
    };
  }
  if (camera.eventStatus === 'danger') {
    return {
      border: 'border-rose-500/80 shadow-[0_0_0_1px_rgba(244,63,94,0.45)]',
      badge: 'bg-rose-500/15 text-rose-200 border-rose-500/40',
      dot: 'bg-rose-500 animate-ping',
      label: camera.eventLabel || '이벤트 확인 필요',
      icon: AlertTriangle,
    };
  }
  if (camera.eventStatus === 'warning') {
    return {
      border: 'border-amber-500/70',
      badge: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
      dot: 'bg-amber-400 animate-pulse',
      label: camera.eventLabel || '주의 필요',
      icon: AlertTriangle,
    };
  }
  return {
    border: 'border-slate-800',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-400 animate-pulse',
    label: '모니터링 중',
    icon: Signal,
  };
}

function gridClass(count: number) {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 xl:grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2';
}

function CameraStream({ camera, overlayEvent, roiConfigs }: { camera: LiveCamera; overlayEvent?: AiEvent; roiConfigs: RoiConfigResponse[] }) {
  const unavailable = camera.connectionStatus === 'offline';
  return (
    <>
      <CameraStreamFrame
        streamUrl={camera.streamUrl}
        streamKind={camera.streamKind}
        title={`${camera.name} live stream`}
        className="absolute inset-0 h-full w-full object-cover"
        dimmed={unavailable}
        cameraLoginId={camera.cameraLoginId}
        overlayEvent={overlayEvent}
      />
      {!unavailable && roiConfigs.length > 0 && (
        <RoiOverlayCanvas rois={roiConfigs} />
      )}
      {unavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712]/90 text-slate-500">
          <SignalZero className="mb-3 h-10 w-10 text-slate-600" />
          <span className="text-xs font-extrabold tracking-wider text-slate-300">연결 없음</span>
          <span className="mt-1 text-[10px] text-slate-500">카메라 연결 상태를 확인해 주세요.</span>
        </div>
      )}
    </>
  );
}

function CameraDangerFallback({ camera }: { camera: LiveCamera }) {
  if (camera.eventStatus !== 'danger' || camera.connectionStatus === 'offline') {
    return null;
  }

  return (
    <div className="absolute inset-0 border-2 border-rose-500 bg-rose-600/10">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
        {camera.eventLabel || '이상 상황'}
      </div>
    </div>
  );
}

export function LiveCameraGrid({ cameras, className = '', compact = false, onCameraClick, cameraStatusMap, overlayEvents = [] }: LiveCameraGridProps) {
  const { activeFullscreenCameraId, requestCameraFullscreen, setCameraCardRef } = useFullscreenCamera();
  const [roiCamera, setRoiCamera] = useState<LiveCamera | null>(null);
  const [roiConfigMap, setRoiConfigMap] = useState<Map<string, RoiConfigResponse[]>>(new Map());
  const [roiRefreshKey, setRoiRefreshKey] = useState(0);
  const [hiddenRoiCameraIds, setHiddenRoiCameraIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const targets = cameras.filter(c => c.cameraDbId);
    if (targets.length === 0) return;
    let cancelled = false;
    Promise.all(
      targets.map(c =>
        fetchRoiConfigs(Number(c.cameraDbId), c.isCorporate)
          .then(rois => ({ id: c.cameraDbId!, rois: rois.filter(r => r.isActive) }))
          .catch(() => ({ id: c.cameraDbId!, rois: [] as RoiConfigResponse[] }))
      )
    ).then(results => {
      if (cancelled) return;
      setRoiConfigMap(new Map(results.map(r => [r.id, r.rois])));
    });
    return () => { cancelled = true; };
  }, [cameras, roiRefreshKey]);

  const handleFullscreen = useCallback((cameraId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void requestCameraFullscreen(cameraId);
  }, [requestCameraFullscreen]);

  const handleToggleRoiVisibility = useCallback((cameraDbId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setHiddenRoiCameraIds(prev => {
      const next = new Set(prev);
      if (next.has(cameraDbId)) {
        next.delete(cameraDbId);
      } else {
        next.add(cameraDbId);
      }
      return next;
    });
  }, []);

  const handleCameraKeyDown = useCallback((camera: LiveCamera, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onCameraClick?.(camera);
  }, [onCameraClick]);

  return (
    <div className={`grid ${gridClass(cameras.length)} gap-3 ${className}`}>
      {cameras.map(camera => {
        const realtimeCameraStatus = cameraStatusMap?.get(camera.cameraLoginId ?? '')
          ?? cameraStatusMap?.get(camera.id)
          ?? cameraStatusMap?.get(camera.cameraDbId ?? '')
          ?? cameraStatusMap?.get(camera.name)
          ?? undefined;
        const style = statusStyle(camera, realtimeCameraStatus?.status);
        const StatusIcon = style.icon;
        const overlayEvent = overlayEvents.find((event) => findCameraForAiEvent(cameras, event)?.id === camera.id);
        const roiConfigs = camera.cameraDbId ? (roiConfigMap.get(camera.cameraDbId) ?? []) : [];
        const roiGroupCount = ROI_GROUPS.filter(group =>
          roiConfigs.some(r => (group.scenarioTypes as readonly string[]).includes(r.scenarioType))
        ).length;
        const roiHidden = !!camera.cameraDbId && hiddenRoiCameraIds.has(camera.cameraDbId);
        return (
          <div
            ref={(element) => setCameraCardRef(camera.id, element)}
            key={camera.id}
            className={`group cursor-pointer overflow-hidden rounded-xl border ${style.border} bg-[#0f172a] text-left transition-colors hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/60`}
            onClick={() => onCameraClick?.(camera)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => handleCameraKeyDown(camera, event)}
          >
            <div className={`relative bg-black ${compact ? 'aspect-video' : cameras.length === 1 ? 'aspect-[16/8]' : 'aspect-video'}`}>
              <CameraStream camera={camera} overlayEvent={overlayEvent} roiConfigs={roiHidden ? [] : roiConfigs} />

              <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded bg-black/75 px-2 py-1 text-[10px] font-extrabold text-rose-300 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                실시간
              </div>

              <div className={`absolute right-2 top-2 z-20 flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-extrabold backdrop-blur ${style.badge}`}>
                <StatusIcon className="h-3 w-3" />
                {style.label}
              </div>

              <CameraDangerFallback camera={camera} />
            </div>

            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                  <p className="truncate text-xs font-extrabold text-white">{camera.name}</p>
                </div>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{camera.location}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {camera.connectionStatus === 'online' ? '정상' : camera.connectionStatus === 'connecting' ? '연결 중' : '오류'}
                </div>
                {camera.cameraDbId && (
                  <button
                    type="button"
                    title="ROI 설정"
                    onClick={(event) => { event.stopPropagation(); setRoiCamera(camera); }}
                    className={`flex items-center gap-1 rounded p-1.5 text-[10px] font-bold transition-colors
                      ${roiGroupCount > 0
                        ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60'
                        : 'bg-slate-900 text-slate-400 hover:bg-blue-900/60 hover:text-blue-300'
                      }`}
                  >
                    <ScanLine className="h-3 w-3" />
                    {roiGroupCount > 0 && <span>ROI {roiGroupCount}</span>}
                  </button>
                )}
                {camera.cameraDbId && roiGroupCount > 0 && (
                  <button
                    type="button"
                    title={roiHidden ? 'ROI 표시' : 'ROI 숨기기'}
                    onClick={(event) => handleToggleRoiVisibility(camera.cameraDbId!, event)}
                    className="rounded bg-slate-900 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    {roiHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                )}
                <button
                  type="button"
                  title={activeFullscreenCameraId === camera.id ? '전체 화면 표시 중' : '전체 화면'}
                  onClick={(event) => handleFullscreen(camera.id, event)}
                  className="rounded bg-slate-900 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <Expand className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {cameras.length === 0 && (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0f172a] text-xs font-semibold text-slate-500">
          등록된 카메라가 없습니다.
        </div>
      )}

      {roiCamera && roiCamera.cameraDbId && (
        <RoiEditorModal
          cameraDbId={Number(roiCamera.cameraDbId)}
          cameraName={roiCamera.name}
          cameraLoginId={roiCamera.cameraLoginId ?? roiCamera.id}
          isCorporate={roiCamera.isCorporate}
          streamUrl={roiCamera.streamUrl}
          streamKind={roiCamera.streamKind}
          onClose={() => { setRoiCamera(null); setRoiRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
