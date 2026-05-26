import { useState, useCallback, useEffect } from 'react';
import { CCTVFloorPlan } from './components/CCTVFloorPlan';
import { SimpleStompClient } from './utils/stomp';
import { Toaster, toast } from 'sonner';
import { 
  Shield, 
  Bell, 
  ChevronDown, 
  Folder, 
  ChevronRight,
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  Camera, 
  Maximize2, 
  Check, 
  AlertTriangle,
  Flame,
  LayoutDashboard,
  Tv,
  TrendingUp,
  Users,
  Settings2,
  Activity,
  HardDrive
} from 'lucide-react';
import hospitalHallwayCctv from '../imports/hospital_hallway_cctv.png';

interface Camera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'normal' | 'alert';
}

const CAMERA_NAMES: Record<string, string> = {
  'CCTV-01': '방 1',
  'CCTV-02': '복도 A',
  'CCTV-03': '방 2',
  'CCTV-04': '출입구',
  'CCTV-05': '대기실',
};

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface BackendEvent {
  type: string;
  camera_id: string;
  timestamp: string;
  severity: string;
  message: string;
}

interface RedesignEvent {
  id: string;
  time: string;
  camera: string;
  type: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'escalated' | 'resolved';
}

export default function App() {
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 'CCTV-01', name: CAMERA_NAMES['CCTV-01'], x: 170, y: 155, status: 'normal' },
    { id: 'CCTV-02', name: CAMERA_NAMES['CCTV-02'], x: 400, y: 155, status: 'normal' },
    { id: 'CCTV-03', name: CAMERA_NAMES['CCTV-03'], x: 630, y: 155, status: 'normal' },
    { id: 'CCTV-04', name: CAMERA_NAMES['CCTV-04'], x: 260, y: 345, status: 'normal' },
    { id: 'CCTV-05', name: CAMERA_NAMES['CCTV-05'], x: 540, y: 345, status: 'normal' },
  ]);

  const [selectedCamera, setSelectedCamera] = useState<Camera | null>({
    id: 'CCTV-02',
    name: CAMERA_NAMES['CCTV-02'],
    x: 400,
    y: 155,
    status: 'normal',
  });

  const [events, setEvents] = useState<RedesignEvent[]>([
    {
      id: 'evt-1',
      time: '13:02:15',
      camera: '복도 A',
      type: 'FALL',
      label: 'FALL (낙상) 감지',
      severity: 'critical',
      status: 'new',
    },
    {
      id: 'evt-2',
      time: '12:58:40',
      camera: '응급실',
      type: 'FAINT',
      label: 'FAINT (실신) 감지',
      severity: 'warning',
      status: 'escalated',
    },
    {
      id: 'evt-3',
      time: '12:45:30',
      camera: '대기실',
      type: 'CROWD',
      label: 'CROWD (혼잡) 감지',
      severity: 'info',
      status: 'resolved',
    },
  ]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isLobbyExpanded, setIsLobbyExpanded] = useState(true);

  // STOMP alert receiver
  const handleAlertEvent = useCallback((
    cameraId: string,
    eventLabel: string,
    severity: 'critical' | 'warning' | 'info',
    rawType: string
  ) => {
    const cameraName = CAMERA_NAMES[cameraId] || cameraId;
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];

    // 1. Update camera status to alert
    setCameras(prev => prev.map(c =>
      c.id === cameraId ? { ...c, status: 'alert' as const } : c
    ));

    // 2. Add event to log
    const newEvent: RedesignEvent = {
      id: `evt-${Date.now()}`,
      time: timeString,
      camera: cameraName,
      type: rawType.toUpperCase().replace('_DETECTED', ''),
      label: `${rawType.toUpperCase().replace('_DETECTED', '')} (${eventLabel}) 감지`,
      severity,
      status: 'new',
    };
    setEvents(prev => [newEvent, ...prev.slice(0, 4)]);

    // 3. Highlight camera
    const updatedCam = cameras.find(c => c.id === cameraId);
    if (updatedCam) {
      setSelectedCamera({ ...updatedCam, status: 'alert' });
    }

    toast.error(`[위험 감지] ${cameraName}에서 ${eventLabel}이(가) 감지되었습니다!`);

    // 4. Auto restore camera status after 5s
    setTimeout(() => {
      setCameras(prev => prev.map(c =>
        c.id === cameraId ? { ...c, status: 'normal' as const } : c
      ));
    }, 5000);
  }, [cameras]);

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
      return 'CCTV-02'; // default to main corridor
    };

    const mapBackendEventType = (
      backendType: string
    ): { eventType: string; severity: 'critical' | 'warning' | 'info' } => {
      let mappedType = '낙상';
      let mappedSeverity: 'critical' | 'warning' | 'info' = 'critical';

      switch (backendType) {
        case 'fall_detected':
          mappedType = '낙상';
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
        handleAlertEvent(mappedCamId, eventType, severity, message.type);
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [handleAlertEvent]);

  const handleCameraClick = useCallback((camera: Camera) => {
    setSelectedCamera(camera);
    toast.info(`${camera.name} (${camera.id}) 실시간 스트림 선택됨`);
  }, []);

  const handleMockEscalation = (action: string) => {
    if (action === 'false_alarm') {
      toast.success('오탐 처리 완료: 경보를 해제했습니다.');
      setEvents(prev => prev.map((e, idx) => idx === 0 ? { ...e, status: 'resolved' } : e));
    } else if (action === 'emergency') {
      toast.error('🚨 비상 출동 상황 발령! 119 및 관계 부서에 긴급 출동 명령을 하달했습니다.');
      setEvents(prev => prev.map((e, idx) => idx === 0 ? { ...e, status: 'escalated' } : e));
    }
  };

  const handleSnapshot = () => {
    toast.success('현재 스트림 화면을 성공적으로 스냅샷 갤러리에 캡처하여 저장하였습니다.');
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      {/* ================= 헤더 (Header) ================= */}
      <header className="h-14 bg-[#0c1626] border-b border-slate-800 px-6 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Shield className="w-6 h-6 fill-blue-500/20" />
            <h1 className="text-base font-bold tracking-wider text-white">스마트 안전 관제 시스템</h1>
          </div>
          <span className="h-4 w-px bg-slate-800" />
          <span className="text-xs font-semibold text-slate-400">통합 관리 대시보드</span>
        </div>

        <div className="flex items-center gap-5">
          {/* 웹소켓 연결 연동 상태 배지 */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#102035] border border-slate-700/50 text-[11px] font-medium">
            <span className="relative flex h-1.5 w-1.5">
              {connectionStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-rose-500'
              }`} />
            </span>
            <span className={
              connectionStatus === 'connected'
                ? 'text-emerald-400'
                : connectionStatus === 'connecting'
                ? 'text-amber-400'
                : 'text-rose-400'
            }>
              {connectionStatus === 'connected' ? '실시간 연동 완료' : connectionStatus === 'connecting' ? '연결 중...' : '연결 해제'}
            </span>
          </div>

          {/* 알림 벨 아이콘 */}
          <button className="relative p-1.5 hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* 사용자 정보 */}
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              관
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">관리자</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </header>

      {/* ================= 메인 뷰 (Main Frame) ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= 1. 좌측 사이드바 (1단계: 공간 선택) ================= */}
        <aside className="w-72 bg-[#0a111f] border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            
            {/* 1단계: 공간 선택 아코디언 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1단계: 공간 선택</h3>
              
              <div className="bg-[#0f192b] border border-slate-800/80 rounded-xl overflow-hidden shadow-inner">
                {/* 아코디언 헤더 */}
                <button 
                  onClick={() => setIsLobbyExpanded(prev => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/20 transition-all border-b border-slate-800"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <Folder className="w-4 h-4 text-blue-400 fill-blue-400/10" />
                    <span className="text-xs font-bold">서울병원</span>
                  </div>
                  {isLobbyExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>

                {/* 아코디언 바디 */}
                {isLobbyExpanded && (
                  <div className="p-1 space-y-1 bg-[#0b1321]">
                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-blue-600/15 border border-blue-500/20 text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-semibold">응급실 1층</span>
                      </div>
                      <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">1</span>
                    </button>

                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <span className="text-xs font-semibold">본관 2층</span>
                      </div>
                      <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">2</span>
                    </button>

                    <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <span className="text-xs font-semibold">중환자실</span>
                      </div>
                      <span className="bg-slate-700 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">0</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 메뉴 탐색 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">메뉴 탐색</h3>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/10">
                  <LayoutDashboard className="w-4 h-4" />
                  대시보드 홈
                </button>
                
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold">
                  <Tv className="w-4 h-4" />
                  디바이스 관리
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  이벤트 통계
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold">
                  <Users className="w-4 h-4" />
                  사용자 / RBAC 설정
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold">
                  <Settings2 className="w-4 h-4" />
                  시스템 설정
                </button>
              </nav>
            </div>

          </div>

          {/* 시스템 장비 상태 정보 */}
          <div className="bg-[#0f192b] border border-slate-800/60 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider">시스템 상태</h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">연결된 카메라</span>
                <span className="text-emerald-400 font-bold font-mono">128 / 128</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-slate-600" />
                  AI 분석 서버
                </span>
                <span className="text-emerald-400 font-bold">정상</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                  저장소 상태
                </span>
                <span className="text-emerald-400 font-bold">정상</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= 2. 중앙 레이아웃 (도면 + 영상 플레이어) ================= */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* 도면 뷰어 */}
          <div className="h-[430px] min-h-[430px]">
            <CCTVFloorPlan
              cameras={cameras}
              onCameraClick={handleCameraClick}
              selectedCameraId={selectedCamera?.id || null}
            />
          </div>

          {/* 영상 플레이어 (3단계) */}
          <div className="bg-[#0a111f] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            {/* 플레이어 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1626] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">3단계: 선택한 CCTV 실시간 영상 (Live Stream)</span>
                <span className="h-3 w-px bg-slate-800" />
                <h2 className="text-sm font-bold text-white">
                  {selectedCamera ? `${selectedCamera.id} - ${selectedCamera.name}` : 'CCTV를 선택해 주세요'}
                </h2>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 스트리밍 중 (RTSP)
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSnapshot}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all" 
                  title="스냅샷 캡처"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all" title="전체화면">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 비디오 프레임 영역 */}
            <div className="relative aspect-video max-h-[360px] bg-black flex items-center justify-center overflow-hidden">
              {/* 메인 스트리밍 백그라운드 이미지 */}
              <img 
                src={hospitalHallwayCctv} 
                alt="Corridor view" 
                className="w-full h-full object-cover opacity-90"
              />

              {/* AI 가이드라인 / 폴리곤 오버레이 */}
              {selectedCamera && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 360">
                  {selectedCamera.id === 'CCTV-02' ? (
                    <>
                      {/* 침대 구역 (Teal/Cyan) */}
                      <polygon points="40,240 180,200 230,280 80,340" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="3 3" />
                      <g transform="translate(130, 205)">
                        <rect x="0" y="0" width="52" height="18" fill="#06b6d4" rx="3" />
                        <text x="26" y="12" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">침대 구역</text>
                      </g>

                      {/* 통로 구역 (Yellow) */}
                      <polygon points="210,350 280,180 340,180 370,350" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                      <g transform="translate(265, 260)">
                        <rect x="0" y="0" width="52" height="18" fill="#d97706" rx="3" />
                        <text x="26" y="12" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">통로 구역</text>
                      </g>

                      {/* 대기 구역 (Green) */}
                      <polygon points="360,250 480,240 520,320 400,340" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
                      <g transform="translate(400, 275)">
                        <rect x="0" y="0" width="52" height="18" fill="#059669" rx="3" />
                        <text x="26" y="12" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">대기 구역</text>
                      </g>
                    </>
                  ) : (
                    <>
                      {/* 타 카메라 통제 영역 오버레이 */}
                      <polygon points="120,80 520,80 520,280 120,280" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 4" />
                      <g transform="translate(280, 95)">
                        <rect x="0" y="0" width="80" height="20" fill="#e11d48" rx="3" />
                        <text x="40" y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">안전 통제 구역</text>
                      </g>
                    </>
                  )}
                </svg>
              )}

              {/* 플레이어 하단 반투명 컨트롤 막대 */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-950/70 backdrop-blur-sm px-4 flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPlaying(p => !p)} 
                    className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    LIVE
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSnapshot}
                    className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ================= 3. 우측 사이드바 (위험 탐지 로그 및 에스컬레이션) ================= */}
        <aside className="w-[380px] bg-[#0a111f] border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* 실시간 AI 위험 탐지 최근 로그 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">실시간 AI 위험 탐지</h3>
              <span className="text-[11px] text-slate-400">최근 이벤트 로그</span>
            </div>

            {/* 로그 카드 영역 */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {events.map((evt) => {
                const isCritical = evt.severity === 'critical';
                const isWarning = evt.severity === 'warning';
                
                return (
                  <div 
                    key={evt.id}
                    className={`bg-[#0f192b] border rounded-xl overflow-hidden transition-all duration-200 ${
                      isCritical 
                        ? 'border-rose-500/60 shadow-lg shadow-rose-500/5' 
                        : isWarning 
                        ? 'border-amber-500/40' 
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="p-3 flex items-start gap-3">
                      {/* 이미지 썸네일 */}
                      <div className="relative w-20 h-16 rounded overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                        <img 
                          src={hospitalHallwayCctv} 
                          alt="Incident snapshot" 
                          className="w-full h-full object-cover filter brightness-90"
                        />
                        {isCritical && (
                          <div className="absolute inset-0 border border-rose-500 animate-pulse bg-rose-500/5" />
                        )}
                        {/* 신규 배지 */}
                        {evt.status === 'new' && (
                          <span className="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none scale-90">
                            신규
                          </span>
                        )}
                      </div>

                      {/* 텍스트 정보 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-16">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1 font-semibold text-rose-400">
                            <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                            {evt.time}
                          </span>
                          <span>[{evt.camera}]</span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate leading-tight">
                          {evt.label}
                        </h4>

                        {/* 하단 제어 조치 버튼 */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <button 
                            onClick={() => toast.info('이벤트에 해당하는 고화질 AI 정밀 스냅샷을 팝업창에 로드합니다.')}
                            className="px-2.5 py-1 text-[9px] font-semibold text-slate-400 hover:text-white bg-slate-800 border border-slate-700/60 hover:bg-slate-700 rounded-md transition-all"
                          >
                            스냅샷 보기
                          </button>
                          
                          {isCritical && (
                            <button 
                              onClick={() => handleMockEscalation('emergency')}
                              className="px-3 py-1 text-[9px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-all font-bold shadow-md shadow-rose-600/10"
                            >
                              출동
                            </button>
                          )}
                          {isWarning && (
                            <button 
                              onClick={() => handleMockEscalation('emergency')}
                              className="px-3 py-1 text-[9px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-all font-bold"
                            >
                              출동
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="text-[11px] text-slate-500 font-semibold hover:text-slate-400 transition-colors mt-2 text-center py-1">
              더보기 ∨
            </button>
          </div>

          <div className="h-px bg-slate-800" />

          {/* 에스컬레이션 상태 */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">에스컬레이션 상태</h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {/* 1단계 */}
              <div className="relative">
                <span className="absolute -left-[22px] top-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a111f] flex items-center justify-center">
                  <Check className="w-1.5 h-1.5 text-white stroke-[3px]" />
                </span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-400">1단계: 간호사 (확인)</span>
                  <span className="text-slate-500 font-mono">13:02:18</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">담당자: 김간호사</div>
              </div>

              {/* 2단계 */}
              <div className="relative">
                <span className="absolute -left-[22px] top-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#0a111f] flex items-center justify-center">
                  <Check className="w-1.5 h-1.5 text-white stroke-[3px]" />
                </span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-400">2단계: 119 대기</span>
                  <span className="text-slate-500 font-mono">13:02:22</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">담당자: 관제센터</div>
              </div>

              {/* 3단계 */}
              <div className="relative">
                <span className="absolute -left-[22px] top-1.5 w-3 h-3 bg-[#0a111f] border-2 border-slate-700 rounded-full" />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500">3단계: 119 출동</span>
                  <span className="text-slate-500 font-mono">대기 중</span>
                </div>
              </div>
            </div>

            {/* 에스컬레이션 제어 조치 조작 버튼 */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                onClick={() => handleMockEscalation('false_alarm')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                오탐 패스
              </button>
              <button 
                onClick={() => handleMockEscalation('emergency')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/10 animate-pulse hover:animate-none"
              >
                <Flame className="w-3.5 h-3.5 fill-white/10" />
                비상 출동 (강제 상황)
              </button>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}