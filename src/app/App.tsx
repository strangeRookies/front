import { useState, useCallback, useEffect } from 'react';
import { CCTVFloorPlan } from './components/CCTVFloorPlan';
import { CCTVVideoPlayer } from './components/CCTVVideoPlayer';
import { SimulationPanel, EventType } from './components/SimulationPanel';
import { EventLog, LogEvent } from './components/EventLog';
import { AlertNotification } from './components/AlertNotification';
import { StatisticsPanel } from './components/StatisticsPanel';
import { Bell, Settings, Video } from 'lucide-react';
import { SimpleStompClient } from './utils/stomp';

interface Camera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'normal' | 'alert';
}

const CAMERA_NAMES: Record<string, string> = {
  'CCTV-01': '1층 로비 입구',
  'CCTV-02': '1층 로비 중앙',
  'CCTV-03': '병동 복도',
  'CCTV-04': '병동 출입구',
  'CCTV-05': '공원 입구',
  'CCTV-06': '공원 산책로',
  'CCTV-07': '주차장 A',
  'CCTV-08': '주차장 B',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  fall: '낙상 사고',
  violence: '폭력/싸움',
  collapse: '쓰러짐',
  fainting: '실신',
};

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface BackendEvent {
  type: string;
  camera_id: string;
  timestamp: string;
  severity: string;
  message: string;
}

export default function App() {
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 'CCTV-01', name: CAMERA_NAMES['CCTV-01'], x: 20, y: 20, status: 'normal' },
    { id: 'CCTV-02', name: CAMERA_NAMES['CCTV-02'], x: 35, y: 35, status: 'normal' },
    { id: 'CCTV-03', name: CAMERA_NAMES['CCTV-03'], x: 60, y: 25, status: 'normal' },
    { id: 'CCTV-04', name: CAMERA_NAMES['CCTV-04'], x: 75, y: 35, status: 'normal' },
    { id: 'CCTV-05', name: CAMERA_NAMES['CCTV-05'], x: 25, y: 65, status: 'normal' },
    { id: 'CCTV-06', name: CAMERA_NAMES['CCTV-06'], x: 35, y: 80, status: 'normal' },
    { id: 'CCTV-07', name: CAMERA_NAMES['CCTV-07'], x: 60, y: 70, status: 'normal' },
    { id: 'CCTV-08', name: CAMERA_NAMES['CCTV-08'], x: 80, y: 80, status: 'normal' },
  ]);

  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [activeAlert, setActiveAlert] = useState<{ message: string; cameraId: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const handleCameraClick = useCallback((camera: Camera) => {
    setSelectedCamera(camera);
  }, []);

  const handleAlertEvent = useCallback((
    cameraId: string,
    eventLabel: string,
    severity: 'critical' | 'warning' | 'info',
    customMessage?: string
  ) => {
    const cameraName = CAMERA_NAMES[cameraId] || cameraId;
    const message = customMessage || `${eventLabel} 감지됨`;

    // 1. 카메라 상태를 alert로 변경
    setCameras(prev => prev.map(c =>
      c.id === cameraId ? { ...c, status: 'alert' as const } : c
    ));

    // 2. 이벤트 로그 추가
    const newEvent: LogEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      cameraId: cameraName,
      eventType: eventLabel,
      severity,
      message,
    };
    setEvents(prev => [newEvent, ...prev]);

    // 3. 알림 표시
    setActiveAlert({ message, cameraId: cameraName });

    // 4. 3초 후 카메라 상태를 정상으로 복구
    setTimeout(() => {
      setCameras(prev => prev.map(c =>
        c.id === cameraId ? { ...c, status: 'normal' as const } : c
      ));
    }, 3000);
  }, []);

  const handleSimulate = useCallback((eventType: EventType, cameraId: string) => {
    const eventLabel = EVENT_TYPE_LABELS[eventType];
    const message = `${eventLabel}이(가) 감지되었습니다. 즉시 확인이 필요합니다.`;
    handleAlertEvent(cameraId, eventLabel, 'critical', message);
  }, [handleAlertEvent]);

  // STOMP WebSocket Connection Effect
  useEffect(() => {
    const mapBackendCameraId = (camId: string): string => {
      const match = camId.match(/cam_0?(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return `CCTV-${num.toString().padStart(2, '0')}`;
      }
      if (camId.toUpperCase().startsWith('CCTV-')) {
        return camId.toUpperCase();
      }
      return 'CCTV-01';
    };

    const mapBackendEventType = (
      backendType: string
    ): { eventType: string; severity: 'critical' | 'warning' | 'info' } => {
      let mappedType = '낙상 사고';
      let mappedSeverity: 'critical' | 'warning' | 'info' = 'critical';

      switch (backendType) {
        case 'fall_detected':
          mappedType = '낙상 사고';
          mappedSeverity = 'critical';
          break;
        case 'bed_fall_detected':
          mappedType = '침대 낙상';
          mappedSeverity = 'critical';
          break;
        case 'violence_detected':
          mappedType = '폭력/싸움';
          mappedSeverity = 'critical';
          break;
        case 'unconscious_detected':
          mappedType = '실신/의식불명';
          mappedSeverity = 'critical';
          break;
        case 'unauthorized_exit':
          mappedType = '무단 이탈';
          mappedSeverity = 'warning';
          break;
        default:
          mappedType = backendType;
          mappedSeverity = 'info';
          break;
      }
      return { eventType: mappedType, severity: mappedSeverity };
    };

    const url = 'ws://localhost:8080/ws';
    const topic = '/topic/alerts';

    console.log(`[STOMP] Initializing connection to ${url}...`);

    const client = new SimpleStompClient({
      url,
      topic,
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onMessage: (message: BackendEvent) => {
        console.log('[STOMP] Received safety event from backend:', message);
        const mappedCamId = mapBackendCameraId(message.camera_id);
        const { eventType, severity } = mapBackendEventType(message.type);
        const eventMessage = message.message || `${eventType} 감지됨`;
        handleAlertEvent(mappedCamId, eventType, severity, eventMessage);
      },
    });

    client.connect();

    return () => {
      console.log('[STOMP] Disconnecting client on unmount...');
      client.disconnect();
    };
  }, [handleAlertEvent]);

  const handleCloseAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const alertCount = cameras.filter(c => c.status === 'alert').length;
  const activeCameras = cameras.filter(c => c.status === 'normal').length;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      {/* 헤더 */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold text-white">CCTV 관제 시스템</h1>
              <div className="flex gap-2">
                <StatisticsPanel
                  totalCameras={cameras.length}
                  activeCameras={activeCameras}
                  alertCount={alertCount}
                  todayEvents={events.length}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* 실시간 연동 상태 배지 */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  {connectionStatus === 'connected' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}></span>
                </span>
                <span className={`${
                  connectionStatus === 'connected'
                    ? 'text-emerald-400'
                    : connectionStatus === 'connecting'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  {connectionStatus === 'connected'
                    ? '실시간 연동 완료'
                    : connectionStatus === 'connecting'
                    ? '백엔드 연결 중...'
                    : '백엔드 연결 해제됨'}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {new Date().toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* 왼쪽 사이드바 - CCTV 목록 */}
        <aside className="w-72 bg-slate-900/50 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">카메라 목록</h3>
            <div className="space-y-1">
              {cameras.map((camera) => (
                <button
                  key={camera.id}
                  onClick={() => handleCameraClick(camera)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    selectedCamera?.id === camera.id
                      ? 'bg-blue-600 text-white'
                      : camera.status === 'alert'
                      ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                      : 'text-gray-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        camera.status === 'alert' ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      <span className="text-sm font-medium">{camera.id}</span>
                    </div>
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="text-xs opacity-75 mt-1 ml-4">{camera.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 모의 테스트 패널 */}
          <div className="p-4 border-t border-slate-800">
            <SimulationPanel
              onSimulate={handleSimulate}
              cameraIds={cameras.map(c => c.id)}
            />
          </div>
        </aside>

        {/* 중앙 - 도면 및 영상 */}
        <main className="flex-1 p-4 overflow-auto">
          <div className="space-y-4">
            {/* 3D 도면 */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400">시설 배치도</h2>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    정상
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    경고
                  </span>
                </div>
              </div>
              <div className="h-[calc(100vh-400px)] min-h-[400px]">
                <CCTVFloorPlan
                  cameras={cameras}
                  onCameraClick={handleCameraClick}
                  selectedCameraId={selectedCamera?.id || null}
                />
              </div>
            </div>

            {/* 영상 뷰어 */}
            {selectedCamera && (
              <CCTVVideoPlayer
                cameraName={selectedCamera.name}
                onClose={() => setSelectedCamera(null)}
              />
            )}
          </div>
        </main>

        {/* 우측 - 이벤트 로그 */}
        <aside className="w-96 bg-slate-900/50 border-l border-slate-800">
          <EventLog events={events} />
        </aside>
      </div>

      {/* 알림 */}
      {activeAlert && (
        <AlertNotification
          message={activeAlert.message}
          cameraId={activeAlert.cameraId}
          onClose={handleCloseAlert}
        />
      )}
    </div>
  );
}