import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Bell, 
  Search, 
  Video, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Volume2, 
  Maximize2, 
  Download,
  AlertTriangle,
  Flame,
  Check,
  Tv,
  LogOut,
  Sliders,
  Settings,
  HelpCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import hospitalHallwayCctv from '../../imports/hospital_hallway_cctv.png';

interface NurseDashboardProps {
  username: string;
  onLogout: () => void;
}

interface IncidentAlert {
  id: string;
  time: string; // HH:MM:SS
  timestamp: number; // millisecond timestamp
  camera: string;
  type: string; // FALL, FAINT, CROWD, FIRE
  label: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'resolved';
}

const INITIAL_ALERTS: IncidentAlert[] = [
  {
    id: 'evt-1',
    time: new Date(Date.now() - 2 * 60 * 1000).toTimeString().split(' ')[0], // 2 mins ago
    timestamp: Date.now() - 2 * 60 * 1000,
    camera: '복도 A',
    type: 'FALL',
    label: 'FALL (낙상) 감지',
    severity: 'critical',
    status: 'new',
  },
  {
    id: 'evt-2',
    time: new Date(Date.now() - 6 * 60 * 1000).toTimeString().split(' ')[0], // 6 mins ago
    timestamp: Date.now() - 6 * 60 * 1000,
    camera: '방 1',
    type: 'FAINT',
    label: 'FAINT (실신) 감지',
    severity: 'warning',
    status: 'new',
  },
  {
    id: 'evt-3',
    time: new Date(Date.now() - 15 * 60 * 1000).toTimeString().split(' ')[0], // 15 mins ago
    timestamp: Date.now() - 15 * 60 * 1000,
    camera: '대기실 1',
    type: 'CROWD',
    label: 'CROWD (혼잡) 감지',
    severity: 'info',
    status: 'resolved',
  },
  {
    id: 'evt-4',
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0], // 2 days ago
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    camera: '출입구',
    type: 'CROWD',
    label: 'CROWD (혼잡) 감지',
    severity: 'info',
    status: 'resolved',
  },
  {
    id: 'evt-5',
    time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0], // 12 days ago
    timestamp: Date.now() - 12 * 24 * 60 * 60 * 1000,
    camera: '후문',
    type: 'FIRE',
    label: 'FIRE (화재 연기) 감지',
    severity: 'critical',
    status: 'resolved',
  }
];

export function NurseDashboard({ username, onLogout }: NurseDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<'home' | 'monitoring' | 'alerts' | 'history' | 'qna' | 'settings'>('home');
  const [alerts, setAlerts] = useState<IncidentAlert[]>(INITIAL_ALERTS);
  const [ticker, setTicker] = useState(0);

  // Search filters for Historical Log
  const [searchDate, setSearchDate] = useState<'today' | 'week' | 'month'>('month');
  const [searchCamera, setSearchCamera] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentAlert | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [playbackProgress, setPlaybackProgress] = useState(30);
  const [playbackVolume, setPlaybackVolume] = useState(80);

  // Run ticker every second to update dynamic time elapsed/timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter alerts occurred in the last 10 minutes (10 * 60 * 1000 = 600,000ms)
  const activeTenMinAlerts = alerts.filter(alert => {
    const elapsed = Date.now() - alert.timestamp;
    return elapsed <= 10 * 60 * 1000;
  });

  const handleTriggerMockAlert = () => {
    const mockTypes = [
      { type: 'FALL', label: 'FALL (낙상) 감지', camera: '복도 A', severity: 'critical' as const },
      { type: 'FAINT', label: 'FAINT (실신) 감지', camera: '방 2', severity: 'warning' as const },
      { type: 'CROWD', label: 'CROWD (혼잡) 감지', camera: '대기실 2', severity: 'info' as const }
    ];
    const pick = mockTypes[Math.floor(Math.random() * mockTypes.length)];
    const now = new Date();
    const newAlert: IncidentAlert = {
      id: `evt-${Date.now()}`,
      time: now.toTimeString().split(' ')[0],
      timestamp: Date.now(),
      camera: pick.camera,
      type: pick.type,
      label: pick.label,
      severity: pick.severity,
      status: 'new'
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));
  };

  const handleTriggerEmergency = () => {
    const confirmDispatch = window.confirm('🚨 [긴급] 119 비상 공동 대처 호출을 발령하시겠습니까?\n현재 구역 주소지로 소방차가 즉시 출동합니다.');
    if (confirmDispatch) {
      alert('비상 출동 명령이 성공적으로 전달되었습니다! 소방 관할서에 실시간 현장 비디오 피드를 자동 공유합니다.');
    }
  };

  // Archive search filtering logic (displays up to 1 month records)
  const filteredHistoryAlerts = alerts.filter(alert => {
    // 1. Keyword filter
    if (searchKeyword && !alert.label.toLowerCase().includes(searchKeyword.toLowerCase()) && !alert.camera.includes(searchKeyword)) {
      return false;
    }
    // 2. Camera filter
    if (searchCamera !== '전체' && alert.camera !== searchCamera) {
      return false;
    }
    // 3. Date range filter
    const age = Date.now() - alert.timestamp;
    if (searchDate === 'today' && age > 24 * 60 * 60 * 1000) {
      return false;
    }
    if (searchDate === 'week' && age > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }
    if (searchDate === 'month' && age > 30 * 24 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  });

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
          <span className="text-xs font-bold text-slate-400">간호사 대시보드</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Active 10m Alerts indicator */}
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] sm:text-xs font-bold text-rose-400">최근 10분 알림: {activeTenMinAlerts.length}건</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200 block">{username || '간호사 김민정'}</span>
              <span className="text-[10px] text-slate-500 font-semibold">간호 파트 관제 담당</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Menu */}
        <aside className="w-64 bg-[#0a111f] border-r border-slate-850 p-4 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">메뉴 탐색</h3>
              <nav className="space-y-1">
                {[
                  { id: 'home', label: '대시보드 홈', icon: Tv },
                  { id: 'monitoring', label: '실시간 모니터링', icon: Video },
                  { id: 'alerts', label: '이벤트 알림 (10분)', icon: Bell, badge: activeTenMinAlerts.length },
                  { id: 'history', label: '이벤트 기록 (한달)', icon: Calendar },
                  { id: 'qna', label: '문의 게시판', icon: HelpCircle },
                  { id: 'settings', label: '관제 설정', icon: Settings }
                ].map((menu) => {
                  const Icon = menu.icon;
                  const isActive = activeMenu === menu.id;

                  return (
                    <button
                      key={menu.id}
                      onClick={() => setActiveMenu(menu.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{menu.label}</span>
                      </div>
                      {menu.badge !== undefined && menu.badge > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'}`}>
                          {menu.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Quick Mock Trigger Panel */}
          <div className="bg-[#0f192b] border border-slate-800 rounded-xl p-3.5 space-y-3.5">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">시뮬레이션 패널</h4>
              <p className="text-[10px] text-slate-500 leading-normal">인터랙티브 기능 검증을 위한 모의 알람 생성기입니다.</p>
            </div>
            
            <button
              onClick={handleTriggerMockAlert}
              className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              모의 위험 알람 발생
            </button>
          </div>
        </aside>

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex overflow-hidden bg-[#070e1b] relative">
          
          {/* ================= VIEW 1: HOME ================= */}
          {activeMenu === 'home' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* CCTV Feed grid (Middle) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    실시간 CCTV 모니터링 (7개소 채널)
                  </h2>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    전 노드 연결 정상 (100%)
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'CCTV-01', name: '방 1', style: 'brightness-90 contrast-100 hue-rotate-15' },
                    { id: 'CCTV-02', name: '복도 A', style: 'border-2 border-rose-500 animate-pulse', alert: true },
                    { id: 'CCTV-03', name: '방 2', style: 'brightness-105 contrast-95' },
                    { id: 'CCTV-04', name: '대기실 1', style: 'saturate-50 contrast-110' },
                    { id: 'CCTV-05', name: '대기실 2', style: 'hue-rotate-60' },
                    { id: 'CCTV-06', name: '출입구', style: 'brightness-75' },
                    { id: 'CCTV-07', name: '후문', style: 'brightness-110 contrast-105' }
                  ].map((cam, idx) => (
                    <div 
                      key={cam.id}
                      className="bg-[#0a111f] border border-slate-800 rounded-xl overflow-hidden shadow-lg group relative flex flex-col cursor-pointer"
                      onClick={() => {
                        const existing = alerts.find(a => a.camera === cam.name);
                        if (existing) setSelectedIncident(existing);
                        else alert(`${cam.name} 실시간 스트림 포커스 완료!`);
                      }}
                    >
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <img 
                          src={hospitalHallwayCctv} 
                          alt={cam.name} 
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 ${cam.style}`}
                        />
                        {/* Status overlays */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-[9px] text-rose-500 font-extrabold bg-rose-500/10 px-1.5 py-0.5 rounded leading-none">LIVE</span>
                        </div>

                        <span className="absolute bottom-2 left-2 text-[10px] text-white font-extrabold bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur">
                          {cam.name}
                        </span>

                        {cam.alert && (
                          <div className="absolute inset-0 bg-rose-600/10 border border-rose-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-rose-600 px-3 py-1 rounded shadow-lg animate-bounce">FALL 낙상 감지!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time AI logs (Right side) */}
              <div className="w-80 border-l border-slate-850 p-4 flex flex-col justify-between flex-shrink-0 bg-[#080f1d]/90">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">실시간 AI 위험 탐지</h3>
                    <p className="text-[10px] text-slate-400 font-medium">실시간 컴퓨터비전 분석 이벤트</p>
                  </div>

                  {/* Active event cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {alerts.slice(0, 4).map((evt) => {
                      const isCritical = evt.severity === 'critical';
                      const isWarning = evt.severity === 'warning';
                      const isResolved = evt.status === 'resolved';

                      return (
                        <div 
                          key={evt.id}
                          className={`bg-[#0c1626] border rounded-xl overflow-hidden transition-all duration-200 ${
                            isResolved 
                              ? 'border-slate-850 opacity-60' 
                              : isCritical 
                              ? 'border-rose-500 shadow-md shadow-rose-500/5' 
                              : isWarning 
                              ? 'border-amber-500' 
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                              <span className={`font-bold font-mono ${isResolved ? 'text-slate-500' : 'text-rose-400'}`}>
                                {isResolved ? '조치 완료' : `🚨 ${evt.time}`}
                              </span>
                              <span className="font-semibold">[{evt.camera}]</span>
                            </div>

                            <h4 className="text-xs font-extrabold text-white leading-tight">
                              {evt.label}
                            </h4>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={() => setSelectedIncident(evt)}
                                className="px-2 py-1 bg-slate-900 border border-slate-800 text-[9px] text-slate-300 font-bold hover:text-white rounded hover:bg-slate-800 transition-all"
                              >
                                녹화분 확인
                              </button>

                              {!isResolved && (
                                <button
                                  onClick={() => handleResolveAlert(evt.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded flex items-center gap-1 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  확인 완료
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Crisis/Emergency Dispatcher Trigger */}
                <div className="pt-4 border-t border-slate-800 space-y-3.5">
                  <div className="bg-[#1a0e14] border border-rose-500/20 rounded-xl p-3 text-[10px] text-slate-400 leading-normal flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span>비상 출동 발령 시 서울 병원 관내 119 안전 파트 및 대기실 긴급 대원이 실시간 연동됩니다.</span>
                  </div>
                  <button
                    onClick={handleTriggerEmergency}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 animate-pulse hover:animate-none transition-all cursor-pointer"
                  >
                    <Flame className="w-4 h-4 fill-white/10" />
                    비 상 출 동
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================= VIEW 2: MONITORING ================= */}
          {activeMenu === 'monitoring' && (
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <h2 className="text-sm font-bold text-white">실시간 고정형 관제 뷰</h2>
              <p className="text-xs text-slate-400">병실 내 카메라의 프레임 조절 및 개별 구역별 오버레이 세부 설정이 가능합니다.</p>
              <div className="h-[400px] border border-slate-850 rounded-2xl bg-black overflow-hidden relative flex items-center justify-center">
                <img src={hospitalHallwayCctv} alt="Live monitoring focus" className="w-full h-full object-cover filter brightness-75 contrast-125" />
                <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-white">복도 A - 실시간 분석 채널 2</span>
                </div>
                {/* Simulated AI coordinates bounding lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 400">
                  <polygon points="100,200 300,180 350,300 120,320" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 5" />
                  <text x="180" y="240" fill="#3b82f6" fontSize="10" fontWeight="bold">낙상 예방 집중구역</text>
                </svg>
              </div>
            </div>
          )}

          {/* ================= VIEW 3: 10-MIN ACTIVE ALERTS ================= */}
          {activeMenu === 'alerts' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
              <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white">이벤트 알림 피드 (최근 10분)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    골든타임 대응을 위해 최근 10분 내에 발생한 위급 이상 행동만을 집중 표기합니다.
                  </p>
                </div>
                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold rounded-full text-xs">
                  진행 위험: {activeTenMinAlerts.length}건
                </span>
              </div>

              {activeTenMinAlerts.length === 0 ? (
                <div className="py-16 text-center bg-[#0a1224] border border-dashed border-slate-850 rounded-2xl">
                  <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-500">최근 10분 동안 감지된 활성 위급 경보가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTenMinAlerts.map((alert) => {
                    const elapsedMs = Date.now() - alert.timestamp;
                    const elapsedMins = Math.floor(elapsedMs / 60000);
                    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
                    const remainingMs = 10 * 60 * 1000 - elapsedMs;
                    const remainingMins = Math.floor(remainingMs / 60000);
                    const remainingSecs = Math.floor((remainingMs % 60000) / 1000);

                    return (
                      <div 
                        key={alert.id}
                        className={`bg-[#0a1224] border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 ${
                          alert.severity === 'critical' ? 'border-rose-500/80 bg-rose-950/5' : 'border-amber-500/50'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-rose-500">
                            <AlertTriangle className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{alert.label}</span>
                              <span className="text-[9px] text-slate-400 font-mono">[{alert.camera}]</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 발생 시간: {alert.time}</span>
                              <span className="text-rose-400 font-semibold">{elapsedMins}분 {elapsedSecs}초 경과</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">메뉴 소멸 대기시간</span>
                            <span className="text-xs font-bold text-slate-300 font-mono">{remainingMins}분 {remainingSecs}초 후 소멸</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedIncident(alert)}
                              className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold"
                            >
                              녹화 재생
                            </button>
                            {alert.status === 'new' && (
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                              >
                                조치 해제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW 4: HISTORICAL LOGS SEARCH (1-MONTH VIDEO SEARCH) ================= */}
          {activeMenu === 'history' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl flex flex-col">
              <div>
                <h2 className="text-base font-extrabold text-white">이벤트 영상 기록 아카이브 (최대 한 달)</h2>
                <p className="text-xs text-slate-400 mt-1">이벤트 발생 일자, 구역 및 행동 카테고리별로 녹화 영상을 간편하게 검색 및 다운로드할 수 있습니다.</p>
              </div>

              {/* Filtering Card */}
              <div className="bg-[#0a1224] border border-slate-850 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date selection presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">조회 기간 설정</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'today', label: '오늘' },
                        { id: 'week', label: '1주일' },
                        { id: 'month', label: '1개월' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setSearchDate(preset.id as any)}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            searchDate === preset.id
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                              : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera dropdown selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">CCTV 채널 위치</label>
                    <select
                      value={searchCamera}
                      onChange={(e) => setSearchCamera(e.target.value)}
                      className="w-full px-3 py-2 bg-[#070e1b] border border-slate-800 rounded-lg text-xs text-slate-300"
                    >
                      <option value="전체">전체 카메라</option>
                      <option value="방 1">방 1 (CCTV-01)</option>
                      <option value="복도 A">복도 A (CCTV-02)</option>
                      <option value="방 2">방 2 (CCTV-03)</option>
                      <option value="대기실 1">대기실 1 (CCTV-04)</option>
                      <option value="대기실 2">대기실 2 (CCTV-05)</option>
                      <option value="출입구">출입구 (CCTV-06)</option>
                      <option value="후문">후문 (CCTV-07)</option>
                    </select>
                  </div>

                  {/* Text search input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">이벤트명 / 키워드</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="예: FALL, 낙상, 대기실"
                        className="w-full pl-9 pr-4 py-2 bg-[#070e1b] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-650"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Results list */}
              <div className="flex-1 min-h-0 bg-[#0a1224] border border-slate-850 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <div className="px-5 py-3.5 bg-slate-900/30 border-b border-slate-850 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">검색 내역 ({filteredHistoryAlerts.length}건)</span>
                  <span className="text-[10px]">최근 30일 영상 아카이빙 한도 보관 중</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
                  {filteredHistoryAlerts.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-xs text-slate-500 font-medium">선택하신 조건에 해당하는 녹화 기록이 존재하지 않습니다.</p>
                    </div>
                  ) : (
                    filteredHistoryAlerts.map((log) => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-850/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">{log.label}</h4>
                              <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded ${
                                log.severity === 'critical' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>{log.severity.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[9px] text-slate-500 font-medium mt-1 font-mono">
                              <span>위치: {log.camera}</span>
                              <span>•</span>
                              <span>일자: 2026-05-{log.timestamp % 2 === 0 ? '25' : '26'} {log.time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedIncident(log)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] transition-colors"
                          >
                            비디오 확인
                          </button>
                          <button
                            onClick={() => alert('해당 10초 간의 AI 관제 로그 녹화 본이 MP4 형식으로 기기에 저장되었습니다.')}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-all"
                            title="영상 다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL: HIGH-FIDELITY CCTV VIDEO PLAYBACK SIMULATOR ================= */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#0a1224] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative animate-scaleUp">
            
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#0c1626] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-sm font-extrabold text-white">이벤트 영상 재생기 (Event Playback)</h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">
                  {selectedIncident.camera} - 2026-05-26 {selectedIncident.time}
                </span>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-[#070e1b] border border-slate-800 hover:border-slate-700 cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* Video Canvas Block */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img 
                src={hospitalHallwayCctv} 
                alt="Corridor view playback" 
                className="w-full h-full object-cover filter contrast-125 brightness-75"
              />

              {/* Analytical scanning laser overlay */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500/60 shadow-lg shadow-rose-500 animate-scanner pointer-events-none" />

              {/* AI Bounding Box on Video */}
              <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 border-2 border-rose-500 rounded bg-rose-500/5 flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold text-white bg-rose-600 px-1.5 py-0.25 rounded uppercase">
                    {selectedIncident.type}
                  </span>
                  <span className="text-[8px] text-slate-300 font-semibold font-mono">98.4% MATCH</span>
                </div>
                <div className="w-full text-center">
                  <span className="text-[10px] text-rose-500 font-extrabold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse">
                    이상 거동 감지 (CRITICAL)
                  </span>
                </div>
              </div>

              {/* Watermark security overlay */}
              <div className="absolute top-4 right-4 text-right select-none opacity-40 font-mono text-[9px] tracking-widest text-slate-400 leading-normal">
                <p>REC CODE: {selectedIncident.id.toUpperCase()}</p>
                <p>SPEED: {playbackSpeed.toFixed(1)}X</p>
              </div>
            </div>

            {/* Playback Controls & Timeline */}
            <div className="bg-[#0c1626] p-4 space-y-4">
              
              {/* Timeline Slider with Bookmark indicator */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>00:{playbackProgress.toString().padStart(2, '0')}</span>
                  <span className="text-rose-400 font-bold">감지 타임스탬프 (00:30)</span>
                  <span>01:00</span>
                </div>
                <div className="relative pt-1.5 pb-1">
                  {/* Slider bar */}
                  <input 
                    type="range"
                    min="0"
                    max="60"
                    value={playbackProgress}
                    onChange={(e) => setPlaybackProgress(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  {/* Alert Bookmark indicator dot */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2.5 bg-rose-500 rounded-full border border-white" title="이벤트 발생 지점" />
                </div>
              </div>

              {/* Row buttons */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPlaying(p => !p)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-all"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <div className="flex items-center gap-1">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={playbackVolume}
                      onChange={(e) => setPlaybackVolume(Number(e.target.value))}
                      className="w-16 h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">재생 속도</span>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 font-bold"
                    >
                      <option value="0.5">0.5x</option>
                      <option value="1.0">1.0x (표준)</option>
                      <option value="1.5">1.5x</option>
                      <option value="2.0">2.0x</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => alert('화면 프레임 캡처 스냅샷 완료')}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> 스냅샷 캡처
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
