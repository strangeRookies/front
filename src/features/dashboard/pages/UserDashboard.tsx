import { useCallback, useState } from 'react';
import {
  Shield, Bell, Search, Video, Calendar, Clock, Play, Pause, Volume2,
  Download, AlertTriangle, Flame, Check, Tv, LogOut,
  HelpCircle, Camera, Plus, Trash2, MessageSquare, Send, ChevronLeft,
  User, Lock, Eye, EyeOff, Phone, Mail, LogIn, KeyRound, Smartphone,
  Users, Building2, Pencil, X, ChevronDown
} from 'lucide-react';
import { LiveCameraGrid } from '../components/LiveCameraGrid';
import { LIVE_CAMERAS } from '../data/cameras';
import { useLiveCameras } from '../hooks/useLiveCameras';
import { CCTVStatsCards } from '../components/CCTVStatsCards';
import hospitalHallwayCctv from '../../../assets/hospital_hallway_cctv.png';
import type { Inquiry } from '../../../shared/types/inquiry';
import { AiDangerPanel } from '../../../components/dashboard/AiDangerPanel';
import { useAiAlertActions } from '../../../hooks/useAiAlertActions';

interface NurseDashboardProps {
  username: string;
  userType: 'individual' | 'corporate';
  onLogout: () => void;
  inquiries: Inquiry[];
  onAddInquiry: (data: Omit<Inquiry, 'id' | 'createdAt'>) => void;
}

interface IncidentAlert {
  id: string;
  time: string;
  timestamp: number;
  camera: string;
  type: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'resolved';
}

interface RegisteredCamera {
  id: string;
  name: string;
  location: string;
  password?: string;
}

const INITIAL_ALERTS: IncidentAlert[] = [
  { id: 'evt-1', time: new Date(Date.now() - 2 * 60 * 1000).toTimeString().split(' ')[0], timestamp: Date.now() - 2 * 60 * 1000, camera: '복도 A', type: 'FALL', label: 'FALL (낙상) 감지', severity: 'critical', status: 'new' },
  { id: 'evt-2', time: new Date(Date.now() - 6 * 60 * 1000).toTimeString().split(' ')[0], timestamp: Date.now() - 6 * 60 * 1000, camera: '방 1', type: 'FAINT', label: 'FAINT (실신) 감지', severity: 'warning', status: 'new' },
  { id: 'evt-3', time: new Date(Date.now() - 15 * 60 * 1000).toTimeString().split(' ')[0], timestamp: Date.now() - 15 * 60 * 1000, camera: '대기실 1', type: 'CROWD', label: 'CROWD (혼잡) 감지', severity: 'info', status: 'resolved' },
  { id: 'evt-4', time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0], timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, camera: '출입구', type: 'CROWD', label: 'CROWD (혼잡) 감지', severity: 'info', status: 'resolved' },
  { id: 'evt-5', time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0], timestamp: Date.now() - 12 * 24 * 60 * 60 * 1000, camera: '후문', type: 'FIRE', label: 'FIRE (화재 연기) 감지', severity: 'critical', status: 'resolved' },
];

const INITIAL_CAMERAS: RegisteredCamera[] = [
  { id: 'CCTV-01', name: '방 1',   location: '1층', password: 'cam1234' },
  { id: 'CCTV-02', name: '복도 A', location: '1층', password: 'hall5678' },
  { id: 'CCTV-03', name: '방 2',   location: '1층' },
];

const MOCK_LOGIN_HISTORY = [
  { date: '2026-05-29 09:42', device: 'Chrome / Windows 11', ip: '192.168.1.×××', status: '성공' },
  { date: '2026-05-28 17:15', device: 'Chrome / Windows 11', ip: '192.168.1.×××', status: '성공' },
  { date: '2026-05-27 08:30', device: 'Safari / macOS',      ip: '192.168.2.×××', status: '성공' },
  { date: '2026-05-26 13:22', device: 'Chrome / Android',    ip: '10.0.0.×××',    status: '실패' },
];

const ALL_MENU_ITEMS = [
  { id: 'home',    label: '대시보드 홈', icon: Tv,         individualOnly: false },
  { id: 'alerts',  label: '이벤트 알림', icon: Bell,       individualOnly: false },
  { id: 'history', label: '이벤트 기록', icon: Calendar,   individualOnly: false },
  { id: 'cameras', label: '카메라 등록', icon: Camera,     individualOnly: true  },
  { id: 'mypage',  label: '마이페이지',  icon: User,       individualOnly: false },
  { id: 'qna',     label: '문의',       icon: HelpCircle, individualOnly: false },
] as const;

type MenuId = typeof ALL_MENU_ITEMS[number]['id'];
type MypageTab = 'profile' | 'password' | 'notifications' | 'account';
type InquiryCategory = Inquiry['category'];

const CATEGORY_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  '알림 및 경보':   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  '모바일':         'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '기타':           'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const CATEGORY_ACTIVE_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-600/20 text-blue-300 border-blue-400/50',
  '알림 및 경보':   'bg-rose-600/20 text-rose-300 border-rose-400/50',
  '모바일':         'bg-violet-600/20 text-violet-300 border-violet-400/50',
  '기타':           'bg-slate-600/20 text-slate-300 border-slate-400/50',
};

const CATEGORIES: InquiryCategory[] = ['카메라 및 영상', '알림 및 경보', '모바일', '기타'];

function eventButtonStyle(severity: 'critical' | 'warning' | 'info') {
  if (severity === 'critical') return 'bg-[#ef4444] hover:bg-red-400';
  if (severity === 'warning')  return 'bg-[#f59e0b] hover:bg-amber-400';
  return 'bg-[#334155] hover:bg-slate-500';
}

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const hasSpec  = /[^a-zA-Z0-9]/.test(pw);
  const score = [pw.length >= 8, hasLower, hasUpper, hasNum, hasSpec].filter(Boolean).length;
  if (score <= 2) return { level: 1, label: '약함', color: 'bg-red-500' };
  if (score <= 3) return { level: 2, label: '보통', color: 'bg-amber-500' };
  return { level: 3, label: '강함', color: 'bg-emerald-500' };
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
export function NurseDashboard({ username, userType, onLogout, inquiries, onAddInquiry }: NurseDashboardProps) {
  const liveCameras = useLiveCameras();
  const [activeMenu, setActiveMenu] = useState<MenuId>('home');
  const [alerts, setAlerts] = useState<IncidentAlert[]>(INITIAL_ALERTS);
  const focusHome = useCallback(() => setActiveMenu('home'), []);
  const {
    acknowledgedAiEventIds,
    dangerAiEvents,
    focusedLiveCameras,
    focusAiEventCamera,
    handleConfirmAiEvent,
    setFocusedCameraId,
  } = useAiAlertActions({ userType, username, liveCameras, focusHome });

  // History filters
  const [searchDate, setSearchDate]       = useState<'today' | 'week' | 'month'>('month');
  const [searchCamera, setSearchCamera]   = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentAlert | null>(null);

  // Playback
  const [isPlaying, setIsPlaying]           = useState(true);
  const [playbackSpeed, setPlaybackSpeed]   = useState(1.0);
  const [playbackProgress, setPlaybackProgress] = useState(30);
  const [playbackVolume, setPlaybackVolume] = useState(80);

  // Camera registration
  const [registeredCameras, setRegisteredCameras] = useState<RegisteredCamera[]>(INITIAL_CAMERAS);
  const [showAddCamera, setShowAddCamera]   = useState(false);
  const [newCamName, setNewCamName]         = useState('');
  const [newCamId, setNewCamId]             = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamPassword, setNewCamPassword] = useState('');
  const [showNewCamPw, setShowNewCamPw]     = useState(false);
  const [showCamPwId, setShowCamPwId]       = useState<string | null>(null);

  // Mypage
  const [mypageTab, setMypageTab]         = useState<MypageTab>('profile');
  const [profileName, setProfileName]     = useState(username || '안전담당자');
  const [profileEmail, setProfileEmail]   = useState(`${username || 'user'}@example.com`);
  const [profilePhone, setProfilePhone]   = useState('010-1234-5678');
  const [currentPw, setCurrentPw]         = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [notifEvent, setNotifEvent]       = useState(true);
  const [notifEmail, setNotifEmail]       = useState(true);
  const [notifSms, setNotifSms]           = useState(false);
  const [notifKakao, setNotifKakao]       = useState(false);
  const [alertLevel, setAlertLevel]       = useState<'all' | 'warning' | 'critical'>('warning');

  // QnA
  const [selectedQnaId, setSelectedQnaId]   = useState<string | null>(null);
  const [showNewQnaModal, setShowNewQnaModal] = useState(false);
  const [qnaTitle, setQnaTitle]             = useState('');
  const [qnaContent, setQnaContent]         = useState('');
  const [qnaCategory, setQnaCategory]       = useState<InquiryCategory>('기타');

  const activeTenMinAlerts = alerts.filter(a => Date.now() - a.timestamp <= 10 * 60 * 1000);
  const myInquiries  = inquiries.filter(inq => inq.username === username);
  const selectedQna  = myInquiries.find(inq => inq.id === selectedQnaId) ?? null;
  const pwStrength   = getPasswordStrength(newPw);

  const handleResolveAlert = (id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));

  const handleTriggerEmergency = () => {
    const ok = window.confirm('🚨 [긴급] 119 비상 공동 대처 호출을 발령하시겠습니까?\n현재 구역 주소지로 소방차가 즉시 출동합니다.');
    if (ok) alert('비상 출동 명령이 성공적으로 전달되었습니다! 소방 관할서에 실시간 현장 비디오 피드를 자동 공유합니다.');
  };

  const handleAddCamera = () => {
    if (!newCamName.trim() || !newCamId.trim()) return;
    setRegisteredCameras(prev => [...prev, {
      id: newCamId.trim(),
      name: newCamName.trim(),
      location: newCamLocation.trim() || '미지정',
      password: newCamPassword.trim() || undefined,
    }]);
    setNewCamName(''); setNewCamId(''); setNewCamLocation(''); setNewCamPassword('');
    setShowNewCamPw(false);
    setShowAddCamera(false);
  };

  const handleSubmitQna = () => {
    if (!qnaTitle.trim() || !qnaContent.trim()) return;
    onAddInquiry({ userId: username, username, userType, category: qnaCategory, title: qnaTitle.trim(), content: qnaContent.trim() });
    setQnaTitle(''); setQnaContent(''); setQnaCategory('기타');
    setShowNewQnaModal(false);
  };

  const handleSaveProfile = () => alert('프로필 정보가 저장되었습니다.');
  const handleChangePassword = () => {
    if (!currentPw) { alert('현재 비밀번호를 입력해 주세요.'); return; }
    if (newPw.length < 8) { alert('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { alert('새 비밀번호가 일치하지 않습니다.'); return; }
    alert('비밀번호가 변경되었습니다.');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };
  const handleSaveNotifications = () => alert('알림 설정이 저장되었습니다.');

  const filteredHistory = alerts.filter(a => {
    if (searchKeyword && !a.label.toLowerCase().includes(searchKeyword.toLowerCase()) && !a.camera.includes(searchKeyword)) return false;
    if (searchCamera !== '전체' && a.camera !== searchCamera) return false;
    const age = Date.now() - a.timestamp;
    if (searchDate === 'today' && age > 86400000) return false;
    if (searchDate === 'week'  && age > 7  * 86400000) return false;
    if (searchDate === 'month' && age > 30 * 86400000) return false;
    return true;
  });

  const CCTV_FEEDS = [
    { id: 'CCTV-01', name: '방 1',     style: 'brightness-90 contrast-100 hue-rotate-15' },
    { id: 'CCTV-02', name: '복도 A',   style: 'border-2 border-rose-500 animate-pulse', alert: true },
    { id: 'CCTV-03', name: '방 2',     style: 'brightness-105 contrast-95' },
    { id: 'CCTV-04', name: '대기실 1', style: 'saturate-50 contrast-110' },
    { id: 'CCTV-05', name: '대기실 2', style: 'hue-rotate-60' },
    { id: 'CCTV-06', name: '출입구',   style: 'brightness-75' },
    { id: 'CCTV-07', name: '후문',     style: 'brightness-110 contrast-105' },
  ];

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col font-sans">

      {/* HEADER */}
      <header className="h-14 bg-[#061224] border-b border-slate-800/60 px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400 fill-blue-400/20" />
          <h1 className="text-sm font-extrabold tracking-wider text-white">스마트 안전 관제 시스템</h1>
          <span className="h-4 w-px bg-slate-700" />
          <span className="text-xs font-bold text-slate-400">
            {userType === 'individual' ? '개인 안전담당자 대시보드' : '기업 안전담당자 대시보드'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-bold text-rose-400">최근 10분 알림: {activeTenMinAlerts.length}건</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200 block">{username || '안전담당자'}</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {userType === 'individual' ? '개인 안전담당자' : '기업 안전담당자'}
              </span>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="w-56 bg-[#071329] border-r border-slate-800/50 flex flex-col flex-shrink-0">
          <div className="p-4 space-y-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">메뉴 탐색</h3>
            <nav className="space-y-0.5">
              {ALL_MENU_ITEMS.filter(item => !item.individualOnly || userType === 'individual').map(({ id, label, icon: Icon }) => {
                const isActive = activeMenu === id;
                const badge = id === 'alerts' ? activeTenMinAlerts.length : undefined;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveMenu(id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive ? 'bg-[#0758D6] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </div>
                    {badge !== undefined && badge > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-[#0758D6]' : 'bg-rose-500 text-white'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex overflow-hidden">

          {/* HOME VIEW */}
          {activeMenu === 'home' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    실시간 CCTV 모니터링
                  </h2>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">전 노드 연결 정상</span>
                </div>
                <CCTVStatsCards
                  activeFeedsCount={liveCameras.filter(c => c.connectionStatus === 'online').length}
                  totalFeedsCount={liveCameras.length}
                  alertsCount={activeTenMinAlerts.length}
                />
                <LiveCameraGrid
                  cameras={focusedLiveCameras}
                  onCameraClick={camera => {
                    setFocusedCameraId(camera.id);
                    const event = alerts.find(alert => alert.camera === camera.location || alert.camera === camera.name);
                    if (event) setSelectedIncident(event);
                  }}
                />
                <div className="hidden grid-cols-1 md:grid-cols-2 gap-3">
                  {CCTV_FEEDS.slice(0, 4).map(cam => (
                    <div
                      key={cam.id}
                      className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => { const e = alerts.find(a => a.camera === cam.name); if (e) setSelectedIncident(e); }}
                    >
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <img src={liveCameras.find(feed => feed.name === cam.id)?.streamUrl || liveCameras[0].streamUrl} alt={cam.name} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-85 ${cam.style}`} />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-[9px] text-rose-400 font-extrabold">LIVE</span>
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] text-white font-bold bg-slate-900/80 px-2 py-0.5 rounded">{cam.name}</span>
                        {cam.alert && (
                          <div className="absolute inset-0 bg-rose-600/10 border border-rose-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-rose-600 px-3 py-1 rounded animate-bounce">FALL 낙상 감지!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-72 bg-[#020817] border-l border-slate-800/50 flex flex-col flex-shrink-0">
                <div className="flex-1 bg-[#071329] m-3 mb-0 rounded-xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800/50">
                    <h3 className="text-base font-bold text-white">실시간 AI 위험 탐지</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <AiDangerPanel
                      events={dangerAiEvents}
                      acknowledgedEventIds={acknowledgedAiEventIds}
                      onFocus={focusAiEventCamera}
                      onConfirm={handleConfirmAiEvent}
                      fallback={alerts.slice(0, 5).map(evt => (
                        <div key={evt.id} className={`bg-[#0f172a] rounded-xl p-3 flex items-center gap-3 ${evt.status === 'resolved' ? 'opacity-50' : ''}`}>
                          <div className="w-12 h-12 bg-[#374151] rounded-lg flex-shrink-0 overflow-hidden">
                            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-[9px] font-bold text-slate-500">LIVE</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight cursor-pointer hover:underline truncate" onClick={() => setSelectedIncident(evt)}>{evt.type} 감지</p>
                            <p className="text-[#cbd5e1] text-xs mt-0.5">{evt.time}</p>
                          </div>
                          {evt.status === 'new' ? (
                            <button onClick={() => handleResolveAlert(evt.id)} className={`${eventButtonStyle(evt.severity)} text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer`}>확인</button>
                          ) : (
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    />
                  </div>
                </div>
                <button onClick={handleTriggerEmergency} className="mx-3 my-3 py-4 bg-[#dc2626] hover:bg-red-500 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Flame className="w-4 h-4 fill-white/20" />
                  비상 출동
                </button>
              </div>
            </div>
          )}

          {/* ALERTS VIEW */}
          {activeMenu === 'alerts' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white">이벤트 알림 피드 (최근 10분)</h2>
                  <p className="text-xs text-slate-400 mt-1">골든타임 대응을 위해 최근 10분 내 발생한 위급 이상 행동만 표기합니다.</p>
                </div>
                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold rounded-full text-xs">진행 위험: {activeTenMinAlerts.length}건</span>
              </div>
              {activeTenMinAlerts.length === 0 ? (
                <div className="py-16 text-center bg-[#071329] border border-dashed border-slate-800 rounded-2xl">
                  <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-500">최근 10분 동안 감지된 활성 위급 경보가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTenMinAlerts.map(alert => {
                    const elapsedMs  = Date.now() - alert.timestamp;
                    const elapsedMins = Math.floor(elapsedMs / 60000);
                    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
                    const remaining  = 10 * 60 * 1000 - elapsedMs;
                    const remMins    = Math.floor(remaining / 60000);
                    const remSecs    = Math.floor((remaining % 60000) / 1000);
                    return (
                      <div key={alert.id} className={`bg-[#071329] border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${alert.severity === 'critical' ? 'border-rose-500/80' : 'border-amber-500/50'}`}>
                        <div className="flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{alert.label}</span>
                              <span className="text-[9px] text-slate-400 font-mono">[{alert.camera}]</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {alert.time}</span>
                              <span className="text-rose-400 font-semibold">{elapsedMins}분 {elapsedSecs}초 경과</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 font-mono">{remMins}분 {remSecs}초 후 소멸</span>
                          <button onClick={() => setSelectedIncident(alert)} className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold cursor-pointer">녹화 재생</button>
                          {alert.status === 'new' && (
                            <button onClick={() => handleResolveAlert(alert.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer">조치 해제</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeMenu === 'history' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl flex flex-col">
              <div>
                <h2 className="text-base font-extrabold text-white">이벤트 영상 기록 아카이브 (최대 한 달)</h2>
                <p className="text-xs text-slate-400 mt-1">이벤트 발생 일자, 구역 및 행동 카테고리별로 녹화 영상을 검색 및 다운로드할 수 있습니다.</p>
              </div>
              <div className="bg-[#071329] border border-slate-800 p-4 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">조회 기간</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[{ id: 'today', label: '오늘' }, { id: 'week', label: '1주일' }, { id: 'month', label: '1개월' }].map(p => (
                        <button key={p.id} onClick={() => setSearchDate(p.id as any)} className={`py-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${searchDate === p.id ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">CCTV 채널</label>
                    <select value={searchCamera} onChange={e => setSearchCamera(e.target.value)} className="w-full px-3 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-slate-300">
                      <option value="전체">전체 카메라</option>
                      {CCTV_FEEDS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">키워드</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder="FALL, 낙상, 복도…" className="w-full pl-9 pr-4 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-5 py-3 bg-slate-900/30 border-b border-slate-800 flex justify-between text-xs text-slate-400">
                  <span className="font-semibold">검색 내역 ({filteredHistory.length}건)</span>
                  <span className="text-[10px]">최근 30일 아카이빙 보관 중</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                  {filteredHistory.length === 0 ? (
                    <div className="py-20 text-center"><p className="text-xs text-slate-500">해당 조건의 녹화 기록이 없습니다.</p></div>
                  ) : filteredHistory.map(log => (
                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-800/10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400"><Video className="w-4 h-4" /></div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{log.label}</h4>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-1 font-mono">
                            <span>위치: {log.camera}</span><span>•</span>
                            <span>2026-05-{log.timestamp % 2 === 0 ? '25' : '26'} {log.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedIncident(log)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] cursor-pointer">비디오 확인</button>
                        <button onClick={() => alert('MP4 저장 완료')} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 cursor-pointer" title="다운로드"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CAMERA REGISTRATION VIEW */}
          {activeMenu === 'cameras' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">카메라 등록 / 관리</h2>
                  <p className="text-xs text-slate-400 mt-1">관제 구역 내 CCTV 카메라를 등록하고 관리합니다.</p>
                </div>
                <button onClick={() => setShowAddCamera(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> 카메라 추가
                </button>
              </div>

              <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">등록된 카메라</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {registeredCameras.map(cam => (
                    <div key={cam.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden group">
                      <div className="relative aspect-video">
                        <img src={liveCameras.find(feed => feed.name === cam.id)?.streamUrl || liveCameras[0].streamUrl} alt={cam.name} className="w-full h-full object-cover opacity-75 brightness-75" />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-[9px] text-rose-400 font-bold">LIVE</span>
                        </div>
                        <button
                          onClick={() => setRegisteredCameras(prev => prev.filter(c => c.id !== cam.id))}
                          className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-red-600 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <p className="text-white font-bold text-sm">{cam.name}</p>
                        <p className="text-slate-400 text-xs">{cam.id} · {cam.location}</p>
                        {cam.password && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <KeyRound className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="text-[11px] font-mono text-slate-400">
                              {showCamPwId === cam.id ? cam.password : '●'.repeat(Math.min(cam.password.length, 8))}
                            </span>
                            <button
                              onClick={() => setShowCamPwId(showCamPwId === cam.id ? null : cam.id)}
                              className="ml-auto text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              {showCamPwId === cam.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {Array(Math.max(0, 6 - registeredCameras.length)).fill(null).map((_, i) => (
                    <div key={i} className="bg-[#111827] border border-dashed border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-800/30" onClick={() => setShowAddCamera(true)}>
                      <div className="w-14 h-14 rounded-full bg-[#d9d9d9]/10 flex items-center justify-center">
                        <Plus className="w-7 h-7 text-slate-400" />
                      </div>
                      <span className="text-slate-500 text-xs font-medium">카메라 추가</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MYPAGE VIEW */}
          {activeMenu === 'mypage' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left tab navigation */}
              <div className="w-52 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0 p-4">
                <div className="flex items-center gap-2 mb-5 px-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-extrabold text-blue-400">
                    {(profileName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{profileName || username}</p>
                    <p className="text-[10px] text-slate-500">{userType === 'individual' ? '개인 안전담당자' : '기업 안전담당자'}</p>
                  </div>
                </div>
                <nav className="space-y-0.5">
                  {([
                    { id: 'profile',       label: '프로필 정보',   icon: User        },
                    { id: 'password',      label: '비밀번호 변경', icon: Lock        },
                    { id: 'notifications', label: '알림 설정',     icon: Bell        },
                    { id: 'account',       label: '계정 관리',     icon: Shield      },
                  ] as { id: MypageTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMypageTab(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        mypageTab === id ? 'bg-[#0758D6] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right content */}
              <div className="flex-1 overflow-y-auto p-8">

                {/* ── 프로필 정보 ── */}
                {mypageTab === 'profile' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">프로필 정보</h2>
                      <p className="text-xs text-slate-400 mt-1">이름, 연락처 등 기본 정보를 수정합니다.</p>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-2xl font-extrabold text-blue-400">
                        {(profileName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{profileName || username}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{userType === 'individual' ? '개인 사용자' : '기업 사용자'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">가입일: 2026-03-15</p>
                      </div>
                    </div>

                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><User className="w-3 h-3" />이름</label>
                        <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />이메일</label>
                        <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />전화번호</label>
                        <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                      </div>
                      <div className="pt-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">계정 유형</label>
                          <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">{userType === 'individual' ? '개인 안전담당자' : '기업 안전담당자'}</div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">아이디</label>
                          <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">{username}</div>
                        </div>
                      </div>
                    </div>

                    <button onClick={handleSaveProfile} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      저장하기
                    </button>
                  </div>
                )}

                {/* ── 비밀번호 변경 ── */}
                {mypageTab === 'password' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">비밀번호 변경</h2>
                      <p className="text-xs text-slate-400 mt-1">보안을 위해 정기적으로 비밀번호를 변경해 주세요.</p>
                    </div>

                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
                      {/* Current password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">현재 비밀번호</label>
                        <div className="relative">
                          <input
                            type={showCurrentPw ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            placeholder="현재 비밀번호 입력"
                            className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"
                          />
                          <button onClick={() => setShowCurrentPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">새 비밀번호</label>
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder="8자 이상, 영문/숫자/특수문자 혼합"
                            className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"
                          />
                          <button onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {newPw && (
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              {[1, 2, 3].map(n => (
                                <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${pwStrength.level >= n ? pwStrength.color : 'bg-slate-800'}`} />
                              ))}
                            </div>
                            <p className={`text-[10px] font-semibold ${pwStrength.level === 1 ? 'text-red-400' : pwStrength.level === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              비밀번호 강도: {pwStrength.label}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">새 비밀번호 확인</label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            placeholder="새 비밀번호 재입력"
                            className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"
                          />
                          <button onClick={() => setShowConfirmPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPw && newPw !== confirmPw && (
                          <p className="text-[10px] text-red-400 font-semibold">비밀번호가 일치하지 않습니다.</p>
                        )}
                        {confirmPw && newPw === confirmPw && (
                          <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> 비밀번호가 일치합니다.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        · 비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.<br />
                        · 변경 후 모든 기기에서 재로그인이 필요합니다.
                      </p>
                    </div>

                    <button onClick={handleChangePassword} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      비밀번호 변경
                    </button>
                  </div>
                )}

                {/* ── 알림 설정 ── */}
                {mypageTab === 'notifications' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">알림 설정</h2>
                      <p className="text-xs text-slate-400 mt-1">이벤트 경보 및 알림 수신 방식을 설정합니다.</p>
                    </div>

                    <div className="bg-[#071329] border border-slate-800 rounded-2xl divide-y divide-slate-800/80">
                      {[
                        { label: '이벤트 경보 알림', desc: '낙상·실신 등 위험 이벤트 감지 시 즉시 알림', icon: Bell, value: notifEvent, onChange: setNotifEvent },
                        { label: '이메일 알림',      desc: '등록된 이메일로 이벤트 요약 발송',           icon: Mail, value: notifEmail, onChange: setNotifEmail },
                        { label: 'SMS 알림',         desc: '등록된 전화번호로 긴급 경보 문자 발송',     icon: Smartphone, value: notifSms, onChange: setNotifSms },
                      ].map(({ label, desc, icon: Icon, value, onChange }) => (
                        <div key={label} className="flex items-center justify-between p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-white">{label}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Toggle value={value} onChange={onChange} />
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-white">알림 민감도</p>
                      <p className="text-[10px] text-slate-400">수신할 최소 경보 수준을 선택합니다.</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {([
                          { id: 'all',      label: '전체',       desc: 'info 이상' },
                          { id: 'warning',  label: '중요 이상',  desc: 'warning 이상' },
                          { id: 'critical', label: '긴급만',     desc: 'critical' },
                        ] as { id: typeof alertLevel; label: string; desc: string }[]).map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setAlertLevel(opt.id)}
                            className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              alertLevel === opt.id
                                ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                                : 'bg-[#020817] border-slate-800 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <p>{opt.label}</p>
                            <p className="text-[9px] font-normal mt-0.5 opacity-60">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleSaveNotifications} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      저장하기
                    </button>
                  </div>
                )}

                {/* ── 계정 관리 ── */}
                {mypageTab === 'account' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">계정 관리</h2>
                      <p className="text-xs text-slate-400 mt-1">로그인 기록 확인 및 계정 설정을 관리합니다.</p>
                    </div>

                    {/* Login history */}
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                        <LogIn className="w-3.5 h-3.5 text-slate-400" />
                        <h3 className="text-xs font-bold text-white">최근 로그인 기록</h3>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {MOCK_LOGIN_HISTORY.map((log, i) => (
                          <div key={i} className="px-5 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-300">{log.device}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-mono">{log.date}</span>
                                <span>·</span>
                                <span className="font-mono">{log.ip}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              log.status === '성공'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{log.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Connected devices */}
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <h3 className="text-xs font-bold text-white">현재 연결된 기기</h3>
                      </div>
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-300">Chrome / Windows 11</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">현재 세션 · 192.168.1.×××</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          현재 기기
                        </span>
                      </div>
                    </div>

                    {/* Danger zone */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-bold text-red-400">위험 구역</h3>
                      <p className="text-[10px] text-slate-400">계정을 탈퇴하면 모든 데이터가 영구 삭제되며 복구할 수 없습니다.</p>
                      <button
                        onClick={() => {
                          if (window.confirm('정말로 계정을 탈퇴하시겠습니까?\n모든 데이터가 영구 삭제됩니다.'))
                            alert('계정 탈퇴 요청이 접수되었습니다. 처리까지 최대 7일이 소요될 수 있습니다.');
                        }}
                        className="px-4 py-2 bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        회원 탈퇴
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* QNA VIEW */}
          {activeMenu === 'qna' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-80 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      내 문의 내역
                    </h2>
                    <button onClick={() => setShowNewQnaModal(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer">
                      <Plus className="w-3 h-3" /> 새 문의
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">총 {myInquiries.length}건 · 미답변 {myInquiries.filter(i => !i.reply).length}건</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {myInquiries.length === 0 ? (
                    <div className="py-14 text-center">
                      <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">문의 내역이 없습니다.</p>
                      <p className="text-[10px] text-slate-600 mt-1">새 문의를 작성해 보세요.</p>
                    </div>
                  ) : myInquiries.map(inq => (
                    <button key={inq.id} onClick={() => setSelectedQnaId(inq.id)} className={`w-full text-left bg-[#071329] border rounded-xl p-3 cursor-pointer ${selectedQnaId === inq.id ? 'border-blue-500/50 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[inq.category]}`}>{inq.category}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${inq.reply ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {inq.reply ? <><Check className="w-2.5 h-2.5" /> 답변완료</> : '미답변'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{inq.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{inq.createdAt}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {selectedQna ? (
                  <div className="max-w-2xl space-y-6">
                    <button onClick={() => setSelectedQnaId(null)} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white cursor-pointer">
                      <ChevronLeft className="w-3.5 h-3.5" /> 목록으로
                    </button>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 bg-[#061224] border-b border-slate-800">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[selectedQna.category]}`}>{selectedQna.category}</span>
                        <h3 className="text-sm font-extrabold text-white mt-2">{selectedQna.title}</h3>
                        <p className="text-[10px] text-slate-500 mt-1.5">작성일: {selectedQna.createdAt}</p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.content}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-px flex-1 bg-slate-800" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관리자 답변</span>
                        <span className="h-px flex-1 bg-slate-800" />
                      </div>
                      {selectedQna.reply ? (
                        <div className="bg-[#0f192b] border border-blue-500/20 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                              <Shield className="w-3 h-3 text-blue-400" />
                            </div>
                            <span className="text-xs font-bold text-blue-400">관리자</span>
                            <span className="text-[10px] text-slate-500">{selectedQna.reply.repliedAt}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.reply.content}</p>
                        </div>
                      ) : (
                        <div className="bg-[#071329] border border-dashed border-slate-700 rounded-2xl p-10 text-center">
                          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-semibold">답변 대기 중입니다.</p>
                          <p className="text-[10px] text-slate-600 mt-1">관리자가 확인 후 빠른 시일 내에 답변드릴 예정입니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold">문의를 선택하거나 새 문의를 작성해 주세요.</p>
                      <button onClick={() => setShowNewQnaModal(true)} className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> 새 문의 작성
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* CAMERA ADD MODAL */}
      {showAddCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">카메라 등록</h3>
              <button onClick={() => { setShowAddCamera(false); setShowNewCamPw(false); }} className="text-xs text-slate-400 hover:text-white cursor-pointer">닫기</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">카메라 ID</label>
                <input value={newCamId} onChange={e => setNewCamId(e.target.value)} placeholder="예: CCTV-08" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">카메라 이름</label>
                <input value={newCamName} onChange={e => setNewCamName(e.target.value)} placeholder="예: 후문 출입구" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">설치 위치</label>
                <input value={newCamLocation} onChange={e => setNewCamLocation(e.target.value)} placeholder="예: 1층 후문" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" />
                  카메라 비밀번호 <span className="text-slate-600 font-normal">(선택)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewCamPw ? 'text' : 'password'}
                    value={newCamPassword}
                    onChange={e => setNewCamPassword(e.target.value)}
                    placeholder="카메라 접속 비밀번호"
                    className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"
                  />
                  <button onClick={() => setShowNewCamPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showNewCamPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={handleAddCamera} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer">등록 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW INQUIRY MODAL */}
      {showNewQnaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                새 문의 작성
              </h3>
              <button onClick={() => setShowNewQnaModal(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">닫기</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">카테고리</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setQnaCategory(cat)} className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${qnaCategory === cat ? CATEGORY_ACTIVE_STYLES[cat] : 'bg-[#020817] border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">제목</label>
                <input value={qnaTitle} onChange={e => setQnaTitle(e.target.value)} placeholder="문의 제목을 입력해 주세요" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">문의 내용</label>
                <textarea value={qnaContent} onChange={e => setQnaContent(e.target.value)} placeholder="문의하실 내용을 자세히 작성해 주세요" rows={5} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none resize-none" />
              </div>
              <button onClick={handleSubmitQna} disabled={!qnaTitle.trim() || !qnaContent.trim()} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2">
                <Send className="w-3.5 h-3.5" /> 문의 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT PLAYBACK MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-sm font-extrabold text-white">이벤트 영상 재생기</h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">
                  {selectedIncident.camera} — 2026-05-26 {selectedIncident.time}
                </span>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-[#020817] border border-slate-800 cursor-pointer">닫기</button>
            </div>
            <div className="relative aspect-video bg-black overflow-hidden">
              <img src={liveCameras[0].streamUrl} alt="Playback stream" className="w-full h-full object-cover contrast-125 brightness-75" />
              <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 border-2 border-rose-500 rounded bg-rose-500/5 flex flex-col justify-between p-2">
                <span className="text-[9px] font-bold text-white bg-rose-600 px-1.5 rounded uppercase self-start">{selectedIncident.type}</span>
                <span className="text-[10px] text-rose-400 font-extrabold text-center animate-pulse">이상 거동 감지 (CRITICAL)</span>
              </div>
            </div>
            <div className="bg-[#061224] p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>00:{playbackProgress.toString().padStart(2, '0')}</span>
                  <span className="text-rose-400 font-bold">감지 타임스탬프 (00:30)</span>
                  <span>01:00</span>
                </div>
                <div className="relative pt-1">
                  <input type="range" min="0" max="60" value={playbackProgress} onChange={e => setPlaybackProgress(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2.5 bg-rose-500 rounded-full border border-white" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsPlaying(p => !p)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white cursor-pointer">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <input type="range" min="0" max="100" value={playbackVolume} onChange={e => setPlaybackVolume(Number(e.target.value))} className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 font-bold cursor-pointer">
                    <option value="0.5">0.5x</option><option value="1.0">1.0x</option><option value="1.5">1.5x</option><option value="2.0">2.0x</option>
                  </select>
                  <button onClick={() => alert('스냅샷 저장 완료')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> 스냅샷
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
