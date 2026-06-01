import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Bell, ChevronDown, Folder, ChevronRight,
  Play, Pause, Volume2, Maximize2, Check,
  LayoutDashboard, Video, LogOut, Settings,
  HelpCircle, Calendar, Activity, HardDrive, Beaker,
  MessageSquare, Send, ChevronLeft, Camera
} from 'lucide-react';
import { CCTVFloorPlan } from '../components/CCTVFloorPlan';
import { LiveCameraGrid } from '../components/LiveCameraGrid';
import { useLiveCameras } from '../hooks/useLiveCameras';
import { CCTVStatsCards } from '../components/CCTVStatsCards';
import { CCTVRegistration } from '../components/CCTVRegistration';
import hospitalHallwayCctv from '../../imports/hospital_hallway_cctv.png';
import type { Inquiry } from '../types/inquiry';

interface IntegratedDashboardProps {
  onLogout: () => void;
  inquiries: Inquiry[];
  onAddReply: (inquiryId: string, replyContent: string) => void;
}

interface CCTVCamera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'normal' | 'alert';
}

const FLOOR_1_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '방 1',    x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '복도 A',  x: 400, y: 155, status: 'alert'  },
  { id: 'CCTV-03', name: '방 2',    x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '출입구',  x: 260, y: 345, status: 'normal' },
  { id: 'CCTV-05', name: '대기실',  x: 540, y: 345, status: 'normal' },
];

const FLOOR_2_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '중환자실 A', x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '복도 B',    x: 400, y: 155, status: 'normal' },
  { id: 'CCTV-03', name: '중환자실 B', x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '계단 통로', x: 260, y: 345, status: 'alert'  },
  { id: 'CCTV-05', name: '간호 센터', x: 540, y: 345, status: 'normal' },
];

const FLOOR_3_CAMERAS: CCTVCamera[] = [
  { id: 'CCTV-01', name: '수술실 입구',  x: 170, y: 155, status: 'normal' },
  { id: 'CCTV-02', name: '수술실 복도',  x: 400, y: 155, status: 'normal' },
  { id: 'CCTV-03', name: '마취 회복실',  x: 630, y: 155, status: 'normal' },
  { id: 'CCTV-04', name: '멸균 구역',   x: 260, y: 345, status: 'normal' },
  { id: 'CCTV-05', name: '장비실',      x: 540, y: 345, status: 'normal' },
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
  { id: 'evt-101', time: '13:02:15', camera: '복도 A',    type: 'FALL',  label: 'FALL (낙상) 감지',  severity: 'critical', status: 'new'      },
  { id: 'evt-102', time: '12:58:40', camera: '계단 통로', type: 'FAINT', label: 'FAINT (실신) 감지', severity: 'warning',  status: 'new'      },
  { id: 'evt-103', time: '12:45:30', camera: '대기실',    type: 'CROWD', label: 'CROWD (혼잡) 감지', severity: 'info',     status: 'resolved' },
  { id: 'evt-104', time: '12:30:10', camera: '수술실 복도', type: 'CROWD', label: 'CROWD (혼잡) 감지', severity: 'info',     status: 'resolved' },
];

const SPACES = [
  {
    id: 'seoul-hospital',
    label: '서울 병원',
    floors: [
      { id: '1F', label: '1층', alerts: 1 },
      { id: '2F', label: '2층', alerts: 1 },
      { id: '3F', label: '3층', alerts: 0 },
    ],
  },
  { id: 'namsan', label: '남산골 공원', floors: [] },
  { id: 'nursing-hospital', label: '서울 요양병원', floors: [] },
  { id: 'community-center', label: '중구 주민센터', floors: [] },
];

type MenuId = 'home' | 'monitoring' | 'alerts' | 'history' | 'qna' | 'settings' | 'cctvReg' | 'test';
type InquiryCategory = Inquiry['category'];

const MENU_ITEMS: { id: MenuId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home',       label: '대시보드 홈',   icon: LayoutDashboard },
  { id: 'monitoring', label: '실시간 모니터링', icon: Video           },
  { id: 'alerts',     label: '이벤트 알림',   icon: Bell            },
  { id: 'history',    label: '이벤트 기록',   icon: Calendar        },
  { id: 'qna',        label: '문의',         icon: HelpCircle      },
  { id: 'settings',   label: '설정',         icon: Settings        },
  { id: 'cctvReg',    label: 'CCTV 등록',     icon: Camera          },
];

const CATEGORY_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  '알림 및 경보':   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  '모바일':         'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '기타':           'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function eventButtonStyle(severity: 'critical' | 'warning' | 'info') {
  if (severity === 'critical') return 'bg-[#ef4444] hover:bg-red-400';
  if (severity === 'warning')  return 'bg-[#f59e0b] hover:bg-amber-400';
  return 'bg-[#334155] hover:bg-slate-500';
}

const TEST_MODE_FEEDS = [
  { id: 'CCTV-01', name: '방1',   alert: false },
  { id: 'CCTV-02', name: '복도A', alert: true  },
  { id: 'CCTV-03', name: '방2',   alert: false },
  { id: 'CCTV-04', name: '출입구', alert: false },
  { id: 'CCTV-05', name: '후문',  alert: false },
  { id: 'CCTV-06', name: '대기실', alert: false },
  { id: 'CCTV-07', name: '대기실 2', alert: false },
];

export function IntegratedDashboard({ onLogout, inquiries, onAddReply }: IntegratedDashboardProps) {
  const liveCameras = useLiveCameras();
  const [activeMenu, setActiveMenu] = useState<MenuId>('home');
  const [selectedFloor, setSelectedFloor] = useState<'1F' | '2F' | '3F'>('1F');
  const [expandedSpace, setExpandedSpace] = useState<string>('seoul-hospital');
  const [cameras, setCameras] = useState<CCTVCamera[]>(FLOOR_1_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(FLOOR_1_CAMERAS[1]);
  const [events, setEvents] = useState<IncidentEvent[]>(INITIAL_EVENTS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(70);

  // Admin QnA state
  const [selectedAdminQnaId, setSelectedAdminQnaId] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');

  const selectedAdminQna = inquiries.find(inq => inq.id === selectedAdminQnaId) ?? null;
  const unansweredCount = inquiries.filter(i => !i.reply).length;
  const answeredCount = inquiries.filter(i => i.reply).length;

  useEffect(() => {
    if (selectedFloor === '1F') { setCameras(FLOOR_1_CAMERAS); setSelectedCamera(FLOOR_1_CAMERAS[1]); }
    else if (selectedFloor === '2F') { setCameras(FLOOR_2_CAMERAS); setSelectedCamera(FLOOR_2_CAMERAS[3]); }
    else { setCameras(FLOOR_3_CAMERAS); setSelectedCamera(FLOOR_3_CAMERAS[1]); }
  }, [selectedFloor]);

  const handleCameraClick = useCallback((cam: CCTVCamera) => setSelectedCamera(cam), []);

  const handleResolveEvent = (id: string) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' as const } : e));

  const handleSubmitReply = () => {
    if (!adminReply.trim() || !selectedAdminQnaId) return;
    onAddReply(selectedAdminQnaId, adminReply.trim());
    setAdminReply('');
  };

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col font-sans">

      {/* ===== HEADER ===== */}
      <header className="h-14 bg-[#061224] border-b border-slate-800/60 px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400 fill-blue-400/20" />
          <h1 className="text-sm font-extrabold tracking-wider text-white">스마트 안전 관제 시스템</h1>
          <span className="h-4 w-px bg-slate-700" />
          <span className="text-xs font-bold text-slate-400">
            {activeMenu === 'test' ? '테스트 모드' : '통합 관리 대시보드'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#102035] border border-slate-700/50 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            실시간 위협 모니터링 연동 중
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">관</div>
            <span className="text-xs font-semibold text-slate-300">최고 관리자</span>
          </div>
          <button onClick={onLogout} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex-1 flex overflow-hidden">

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="w-64 bg-[#071329] border-r border-slate-800/50 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-4 space-y-6 flex-1">

            {/* 공간 선택 */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">공간 선택</h3>
              <div className="space-y-1">
                {SPACES.map(space => (
                  <div key={space.id}>
                    <button
                      onClick={() => setExpandedSpace(expandedSpace === space.id ? '' : space.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-blue-400" />
                        <span>{space.label}</span>
                      </div>
                      {space.floors.length > 0 && (
                        expandedSpace === space.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                    {expandedSpace === space.id && space.floors.length > 0 && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {space.floors.map(floor => {
                          const isSelected = selectedFloor === floor.id;
                          return (
                            <button
                              key={floor.id}
                              onClick={() => { setSelectedFloor(floor.id as any); if (activeMenu === 'test') setActiveMenu('home'); }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected ? 'bg-blue-600/15 border border-blue-500/20 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-slate-600'}`} />
                                <span>{floor.label}</span>
                              </div>
                              {floor.alerts > 0 && (
                                <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{floor.alerts}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 메뉴 탐색 */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">메뉴 탐색</h3>
              <nav className="space-y-0.5">
                {MENU_ITEMS.map(({ id, label, icon: Icon }) => {
                  const badge = id === 'qna' ? unansweredCount : undefined;
                  const isActive = activeMenu === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveMenu(id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive ? 'bg-[#0758D6] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {label}
                      </div>
                      {badge !== undefined && badge > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-[#0758D6]' : 'bg-amber-500 text-white'}`}>
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

          </div>

          {/* 장비 상태 */}
          <div className="p-4">
            <div className="bg-[#0f192b] border border-slate-800/60 rounded-xl p-3.5 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">장비 상태</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">연결된 카메라</span>
                  <span className="text-emerald-400 font-bold font-mono">128 / 128</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-600" />AI 분석 엔진</span>
                  <span className="text-emerald-400 font-bold">정상</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-slate-600" />스토리지</span>
                  <span className="text-emerald-400 font-bold font-mono">92.4% 여유</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== CENTER ===== */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* HOME view */}
          {activeMenu === 'home' && (
            <div className="flex-1 p-4 gap-4 overflow-y-auto flex flex-col">
              <CCTVStatsCards
                activeFeedsCount={liveCameras.filter(c => c.connectionStatus === 'online').length}
                totalFeedsCount={liveCameras.length}
                alertsCount={events.filter(e => e.status === 'new').length}
              />
              <div className="h-[400px] min-h-[400px]">
                <CCTVFloorPlan cameras={cameras} onCameraClick={handleCameraClick} selectedCameraId={selectedCamera?.id || null} />
              </div>
              <div className="bg-[#071329] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-[#061224] border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">보조 모니터링: </span>
                    <h2 className="text-xs font-extrabold text-white">{selectedCamera ? `${selectedCamera.id} — ${selectedCamera.name}` : '선택된 CCTV 없음'}</h2>
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold border border-emerald-500/15">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> 실시간 RTSP
                    </div>
                  </div>
                  <Maximize2 className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
                </div>
                <div className="relative bg-black overflow-hidden p-3">
                  <LiveCameraGrid
                    cameras={liveCameras.filter(camera => camera.name === selectedCamera?.id).slice(0, 1)}
                    compact
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                    CH-0{selectedCamera ? selectedCamera.id.replace('CCTV-', '') : '2'}
                  </div>
                  {selectedCamera && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 360">
                      <rect x="180" y="80" width="280" height="200" fill="none" stroke={selectedCamera.status === 'alert' ? '#ef4444' : '#10b981'} strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x="320" y="70" textAnchor="middle" fill={selectedCamera.status === 'alert' ? '#ef4444' : '#10b981'} fontSize="9" fontWeight="bold">
                        {selectedCamera.status === 'alert' ? '위해 상황 감지 구역' : '안심 모니터링 구역'}
                      </text>
                    </svg>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-950/70 backdrop-blur px-4 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white transition-colors cursor-pointer">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4" />
                        <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-rose-500 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" /> LIVE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEST MODE view */}
          {activeMenu === 'test' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-blue-400" />
                  테스트 모드 — 전체 CCTV 피드
                </h2>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  전 노드 연결 정상
                </span>
              </div>
              <LiveCameraGrid cameras={liveCameras} />
              <div className="hidden grid-cols-1 md:grid-cols-2 gap-3">
                {TEST_MODE_FEEDS.slice(0, 4).map(cam => (
                  <div key={cam.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden group">
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <img src={liveCameras.find(feed => feed.name === cam.id)?.streamUrl || liveCameras[0].streamUrl} alt={cam.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[9px] text-rose-400 font-bold">LIVE</span>
                      </div>
                      <span className="absolute bottom-2 left-2 text-[10px] text-white font-bold bg-slate-900/80 px-2 py-0.5 rounded">{cam.name}</span>
                      {cam.alert && (
                        <div className="absolute inset-0 bg-rose-600/10 border border-rose-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold bg-rose-600 px-2 py-0.5 rounded animate-bounce">FALL 감지</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MONITORING view */}
          {activeMenu === 'monitoring' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <h2 className="text-sm font-bold text-white">전체 구역 고정형 관제 뷰</h2>
              <div className="h-[400px] border border-slate-800 rounded-2xl bg-black overflow-hidden relative">
                <LiveCameraGrid cameras={liveCameras} className="h-full p-3" />
                <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-white">복도 A — 실시간 분석 채널</span>
                </div>
              </div>
            </div>
          )}

          {/* ALERTS / HISTORY / SETTINGS placeholder */}
          {(activeMenu === 'alerts' || activeMenu === 'history' || activeMenu === 'settings') && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                {activeMenu === 'alerts' && <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />}
                {activeMenu === 'history' && <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />}
                <p className="text-sm font-semibold">
                  {activeMenu === 'alerts' ? '이벤트 알림 페이지 준비 중' : '이벤트 기록 페이지 준비 중'}
                </p>
              </div>
            </div>
          )}

          {/* ===== CCTV REGISTRATION VIEW ===== */}
          {activeMenu === 'cctvReg' && (
            <CCTVRegistration 
              onRegisterComplete={(count) => {
                console.log(`Registered ${count} corporate cameras successfully.`);
              }}
            />
          )}

          {/* ===== QNA ADMIN VIEW ===== */}
          {activeMenu === 'qna' && (
            <div className="flex-1 flex overflow-hidden">

              {/* Left: inquiry list */}
              <div className="w-96 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0 overflow-hidden">
                {/* Stats header */}
                <div className="p-4 border-b border-slate-800/60">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    문의 관리
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#071329] border border-slate-800 rounded-xl p-2.5 text-center">
                      <p className="text-base font-extrabold text-white">{inquiries.length}</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5">전체</p>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-base font-extrabold text-amber-400">{unansweredCount}</p>
                      <p className="text-[9px] text-amber-600 font-bold mt-0.5">미답변</p>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                      <p className="text-base font-extrabold text-emerald-400">{answeredCount}</p>
                      <p className="text-[9px] text-emerald-600 font-bold mt-0.5">답변완료</p>
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {inquiries.length === 0 ? (
                    <div className="py-14 text-center">
                      <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">접수된 문의가 없습니다.</p>
                    </div>
                  ) : inquiries.map(inq => (
                    <button
                      key={inq.id}
                      onClick={() => { setSelectedAdminQnaId(inq.id); setAdminReply(''); }}
                      className={`w-full text-left bg-[#071329] border rounded-xl p-3 transition-all cursor-pointer ${
                        selectedAdminQnaId === inq.id
                          ? 'border-blue-500/50 bg-blue-600/5'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[inq.category]}`}>
                            {inq.category}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {inq.userType === 'individual' ? '개인' : '기업'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          inq.reply
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {inq.reply ? <><Check className="w-2.5 h-2.5" />답변완료</> : '미답변'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{inq.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">{inq.username}</span>
                        <span className="text-[10px] text-slate-600">{inq.createdAt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Detail + Reply */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedAdminQna ? (
                  <div className="max-w-2xl space-y-6">
                    <button
                      onClick={() => setSelectedAdminQnaId(null)}
                      className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      목록으로
                    </button>

                    {/* Inquiry content */}
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 bg-[#061224] border-b border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[selectedAdminQna.category]}`}>
                            {selectedAdminQna.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {selectedAdminQna.userType === 'individual' ? '개인 사용자' : '기업 사용자'} · {selectedAdminQna.username}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white">{selectedAdminQna.title}</h3>
                        <p className="text-[10px] text-slate-500 mt-1.5">작성일: {selectedAdminQna.createdAt}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedAdminQna.content}</p>
                      </div>
                    </div>

                    {/* Reply section */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-px flex-1 bg-slate-800" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {selectedAdminQna.reply ? '등록된 답변' : '답변 작성'}
                        </span>
                        <span className="h-px flex-1 bg-slate-800" />
                      </div>

                      {selectedAdminQna.reply ? (
                        <div className="bg-[#0f192b] border border-emerald-500/20 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                              <Shield className="w-3 h-3 text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-emerald-400">관리자 답변</span>
                            <span className="text-[10px] text-slate-500">{selectedAdminQna.reply.repliedAt}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedAdminQna.reply.content}</p>
                        </div>
                      ) : (
                        <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
                          <textarea
                            value={adminReply}
                            onChange={e => setAdminReply(e.target.value)}
                            placeholder="사용자에게 전달할 답변을 작성해 주세요..."
                            rows={5}
                            className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none resize-none transition-colors"
                          />
                          <button
                            onClick={handleSubmitReply}
                            disabled={!adminReply.trim()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" />
                            답변 등록
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold">문의를 선택하여 답변을 작성해 주세요.</p>
                      {unansweredCount > 0 && (
                        <p className="text-xs text-amber-500 mt-2 font-semibold">미답변 문의 {unansweredCount}건이 대기 중입니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* ===== RIGHT PANEL ===== */}
        <aside className="w-72 bg-[#020817] border-l border-slate-800/50 flex flex-col flex-shrink-0">
          <div className="flex-1 bg-[#071329] m-3 mb-0 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800/50">
              <h3 className="text-base font-bold text-white">실시간 AI 위험 탐지</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">전 구역 안전 경보 리스트</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {events.map(evt => (
                <div
                  key={evt.id}
                  className={`bg-[#0f172a] rounded-xl p-3 flex items-center gap-3 transition-opacity ${evt.status === 'resolved' ? 'opacity-50' : ''}`}
                >
                  <div className="w-12 h-12 bg-[#374151] rounded-lg flex-shrink-0 overflow-hidden">
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-[9px] font-bold text-slate-500">LIVE</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">{evt.type} 감지</p>
                    <p className="text-[#cbd5e1] text-xs mt-0.5">{evt.time}</p>
                  </div>
                  {evt.status === 'new' ? (
                    <button
                      onClick={() => handleResolveEvent(evt.id)}
                      className={`${eventButtonStyle(evt.severity)} text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer transition-colors`}
                    >
                      확인
                    </button>
                  ) : (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveMenu(activeMenu === 'test' ? 'home' : 'test')}
            className={`mx-3 my-3 py-4 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeMenu === 'test'
                ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-300/30'
                : 'bg-[#1e3a8a] hover:bg-blue-700 text-white border-blue-500/20'
            }`}
          >
            <Beaker className="w-4 h-4" />
            {activeMenu === 'test' ? '테스트 종료' : '테스트 모드'}
          </button>
        </aside>

      </div>
    </div>
  );
}
