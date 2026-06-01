import React, { useState, useCallback, useEffect } from 'react';
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
  HardDrive,
  LogOut
} from 'lucide-react';
import { CCTVFloorPlan } from '../components/CCTVFloorPlan';
import hospitalHallwayCctv from '../../imports/hospital_hallway_cctv.png';

interface IntegratedDashboardProps {
  onLogout: () => void;
}

interface CCTVCamera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'normal' | 'alert';
}

const FLOOR_1_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '방 1', x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '복도 A', x: 400, y: 155, status: 'alert' },
  { id: 'CCTV-03', name: '방 2', x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '출입구', x: 260, y: 345, status: 'normal' },
  { id: 'CCTV-05', name: '대기실', x: 540, y: 345, status: 'normal' },
];

const FLOOR_2_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '중환자실 A', x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '복도 B', x: 400, y: 155, status: 'normal' },
  { id: 'CCTV-03', name: '중환자실 B', x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '계단 통로', x: 260, y: 345, status: 'alert' },
  { id: 'CCTV-05', name: '간호 센터', x: 540, y: 345, status: 'normal' },
];

const FLOOR_3_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '수술실 입구', x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '수술실 복도', x: 400, y: 155, status: 'normal' },
  { id: 'CCTV-03', name: '마취 회복실', x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '멸균 구역', x: 260, y: 345, status: 'normal' },
  { id: 'CCTV-05', name: '장비실', x: 540, y: 345, status: 'normal' },
];

interface IncidentEvent {
  id: string;
  time: string;
  camera: string;
  type: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'resolved';
}

const INITIAL_EVENTS: IncidentEvent[] = [
  {
    id: 'evt-101',
    time: '13:02:15',
    camera: '복도 A',
    type: 'FALL',
    label: 'FALL (낙상) 감지',
    severity: 'critical',
    status: 'new',
  },
  {
    id: 'evt-102',
    time: '12:58:40',
    camera: '계단 통로',
    type: 'FAINT',
    label: 'FAINT (실신) 감지',
    severity: 'warning',
    status: 'new',
  },
  {
    id: 'evt-103',
    time: '12:45:30',
    camera: '대기실',
    type: 'CROWD',
    label: 'CROWD (혼잡) 감지',
    severity: 'info',
    status: 'resolved',
  },
  {
    id: 'evt-104',
    time: '12:30:10',
    camera: '수술실 복도',
    type: 'CROWD',
    label: 'CROWD (혼잡) 감지',
    severity: 'info',
    status: 'resolved',
  }
];

export function IntegratedDashboard({ onLogout }: IntegratedDashboardProps) {
  const [selectedFloor, setSelectedFloor] = useState<'1F' | '2F' | '3F'>('1F');
  const [cameras, setCameras] = useState<CCTVCamera[]>(FLOOR_1_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(FLOOR_1_CAMERAS[1]); // Focus Corridor A/CCTV-02
  const [events, setEvents] = useState<IncidentEvent[]>(INITIAL_EVENTS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(70);

  // Update cameras based on floor switch
  useEffect(() => {
    if (selectedFloor === '1F') {
      setCameras(FLOOR_1_CAMERAS);
      setSelectedCamera(FLOOR_1_CAMERAS[1]);
    } else if (selectedFloor === '2F') {
      setCameras(FLOOR_2_CAMERAS);
      setSelectedCamera(FLOOR_2_CAMERAS[3]); // Focus Staircase CCTV-04
    } else {
      setCameras(FLOOR_3_CAMERAS);
      setSelectedCamera(FLOOR_3_CAMERAS[1]);
    }
  }, [selectedFloor]);

  const handleCameraClick = useCallback((camera: CCTVCamera) => {
    setSelectedCamera(camera);
  }, []);

  const handleResolveEvent = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' as const } : e));
  };

  const handleTriggerEmergency = () => {
    const confirmDispatch = window.confirm('🚨 [긴급] 119 비상 출동 조치를 강제 승인하시겠습니까?\n현재 층수의 정밀 도면 지도가 즉시 긴급 출동 차량 네비게이션으로 전달됩니다.');
    if (confirmDispatch) {
      alert('비상 출동 강제 협조 조치가 완료되었습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 flex flex-col font-sans">
      
      {/* ================= HEADER ================= */}
      <header className="h-14 bg-[#0c1626] border-b border-slate-800 px-6 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-500">
            <Shield className="w-6 h-6 fill-blue-500/20" />
            <h1 className="text-base font-extrabold tracking-wider text-white">스마트 안전 관제 시스템</h1>
          </div>
          <span className="h-4 w-px bg-slate-800" />
          <span className="text-xs font-bold text-slate-400">통합 관리 대시보드</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#102035] border border-slate-700/50 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            실시간 위협 모니터링 연동 중
          </div>

          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              관
            </div>
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">최고 관리자</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>

          <button 
            onClick={onLogout}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= LEFT SIDEBAR (Two Split Blocks) ================= */}
        <aside className="w-72 bg-[#0a111f] border-r border-slate-800 p-4 flex flex-col justify-between flex-shrink-0 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Top Block: 공간 선택 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">공간 선택</h3>
              <div className="bg-[#0f192b] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                {/* Section Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800 bg-[#0c1626]">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Folder className="w-4 h-4 text-blue-400 fill-blue-400/10" />
                    <span className="text-xs font-bold">서울 병원</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>

                {/* Floors List */}
                <div className="p-1.5 space-y-1 bg-[#0b1321]">
                  {[
                    { id: '1F', label: '서울병원 1층', alerts: 1 },
                    { id: '2F', label: '서울병원 2층', alerts: 1 },
                    { id: '3F', label: '서울병원 3층', alerts: 0 }
                  ].map((floor) => {
                    const isSelected = selectedFloor === floor.id;
                    return (
                      <button
                        key={floor.id}
                        onClick={() => setSelectedFloor(floor.id as any)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600/15 border border-blue-500/20 text-white' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-slate-600'}`} />
                          <span>{floor.label}</span>
                        </div>
                        {floor.alerts > 0 && (
                          <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {floor.alerts}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Block: 메뉴 탐색 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">메뉴 탐색</h3>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/10 cursor-pointer">
                  <LayoutDashboard className="w-4 h-4" />
                  대시보드 홈
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold cursor-pointer">
                  <Tv className="w-4 h-4" />
                  디바이스 관리
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold cursor-pointer">
                  <TrendingUp className="w-4 h-4" />
                  이벤트 통계
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all text-xs font-semibold cursor-pointer">
                  <Users className="w-4 h-4" />
                  사용자 / RBAC 설정
                </button>
              </nav>
            </div>

          </div>

          {/* System status information */}
          <div className="bg-[#0f192b] border border-slate-800/60 rounded-xl p-3.5 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">장비 관리 및 상태</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">연결된 카메라</span>
                <span className="text-emerald-400 font-bold font-mono">128 / 128</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-600" />
                  AI 분석 엔진
                </span>
                <span className="text-emerald-400 font-bold">정상</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                  스토리지 용량
                </span>
                <span className="text-emerald-400 font-bold font-mono">92.4% 여유</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= CENTER PANELS (Floor plan & Secondary videos) ================= */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          
          {/* Top Block: Interactive Floor Plan */}
          <div className="h-[430px] min-h-[430px]">
            <CCTVFloorPlan
              cameras={cameras}
              onCameraClick={handleCameraClick}
              selectedCameraId={selectedCamera?.id || null}
            />
          </div>

          {/* Bottom Block: Complementary CCTV live player */}
          <div className="bg-[#0a111f] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1626] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">보조 모니터링: </span>
                <h2 className="text-xs font-extrabold text-white">
                  {selectedCamera ? `${selectedCamera.id} - ${selectedCamera.name}` : '선택된 CCTV가 없습니다'}
                </h2>
                <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold border border-emerald-500/15">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 RTSP 피드 연결됨
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors cursor-pointer">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            {/* Video preview with security scanning lines */}
            <div className="relative aspect-video max-h-[300px] bg-black overflow-hidden flex items-center justify-center">
              <img 
                src={hospitalHallwayCctv} 
                alt="Selected feed stream" 
                className="w-full h-full object-cover opacity-80 filter brightness-90 contrast-110"
              />
              <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                CH-0{selectedCamera ? selectedCamera.id.replace('CCTV-', '') : '2'}
              </div>

              {/* Custom SVG bounding guidelines to feel premium */}
              {selectedCamera && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 360">
                  <rect x="180" y="80" width="280" height="200" fill="none" stroke={selectedCamera.status === 'alert' ? '#ef4444' : '#10b981'} strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="320" y="70" textAnchor="middle" fill={selectedCamera.status === 'alert' ? '#ef4444' : '#10b981'} fontSize="9" fontWeight="bold" className="uppercase animate-pulse">
                    {selectedCamera.status === 'alert' ? '위해 상황 감지 구역' : '안심 모니터링 구역'}
                  </text>
                </svg>
              )}

              {/* Tiny translucence player bar */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-950/70 backdrop-blur px-4 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4" />
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] text-rose-500 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                  LIVE
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ================= RIGHT SIDEBAR (AI Danger events list & dispatcher) ================= */}
        <aside className="w-[380px] bg-[#0a111f] border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">실시간 AI 위험 탐지</h3>
              <span className="text-[10px] text-slate-400">전 구역 안전 경보 리스트</span>
            </div>

            {/* Incident logs card map */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {events.map((evt) => {
                const isCritical = evt.severity === 'critical';
                const isWarning = evt.severity === 'warning';
                const isResolved = evt.status === 'resolved';

                return (
                  <div 
                    key={evt.id}
                    className={`bg-[#0f192b] border rounded-xl overflow-hidden transition-all duration-200 ${
                      isResolved 
                        ? 'border-slate-850 opacity-60' 
                        : isCritical 
                        ? 'border-rose-500/80 shadow-md shadow-rose-500/5' 
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="p-3 flex items-start gap-3">
                      <div className="relative w-16 aspect-square rounded overflow-hidden bg-slate-900 border border-slate-850 flex-shrink-0">
                        <img 
                          src={hospitalHallwayCctv} 
                          alt="Snapshot preview" 
                          className="w-full h-full object-cover filter brightness-75"
                        />
                        {isCritical && !isResolved && (
                          <div className="absolute inset-0 border border-rose-500 animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between h-16">
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 font-bold text-rose-400 font-mono">
                            <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                            {evt.time}
                          </span>
                          <span className="font-semibold">[{evt.camera}]</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-white truncate leading-tight mt-0.5">
                          {evt.label}
                        </h4>

                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => alert('정밀 캡처 팝업 완료')}
                            className="px-2 py-0.5 text-[9px] font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded transition-all"
                          >
                            스냅샷
                          </button>
                          
                          {!isResolved && (
                            <button 
                              onClick={() => handleResolveEvent(evt.id)}
                              className="px-2 py-0.5 text-[9px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                            >
                              처리
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-850" />

          {/* Crisis dispatcher emergency trigger */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">비상 연동 및 에스컬레이션</h3>
            
            <div className="space-y-3 bg-[#0d1627] border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">1단계: 담당 의원 현장 호출</span>
                <span className="text-emerald-400 font-bold">처리됨 (13:02:18)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">2단계: 119 긴급 연동 대기</span>
                <span className="text-emerald-400 font-bold">연동 대기 완료 (13:02:22)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">3단계: 관내 종합 파트 출동</span>
                <span className="text-slate-500 font-medium">소방관 승인 대기 중</span>
              </div>
            </div>

            <button
              onClick={handleTriggerEmergency}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-600/10 cursor-pointer animate-pulse"
            >
              <Flame className="w-3.5 h-3.5" />
              비상 상황 강제 조치 발령
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}
