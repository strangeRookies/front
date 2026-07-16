import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Shield, Bell, ChevronDown, Folder, ChevronRight,
  Play, Pause, Volume2, Maximize2, Check,
  LayoutDashboard, LogOut,
  HelpCircle, Calendar, Beaker,
  MessageSquare, Send, ChevronLeft, Camera,
  Users, Building2, User, Pencil, X, Search,
  Video, Clock, AlertTriangle, Flame, Download, Tv,
  Trash2, Plus, Eye, EyeOff, Lock, Mail, Phone,
  LogIn, KeyRound, Smartphone
} from 'lucide-react';
import { CCTVFloorPlan } from '../components/CCTVFloorPlan';
import { CorporateFloorPlan } from '../components/CorporateFloorPlan';
import { LiveCameraGrid } from '../components/LiveCameraGrid';
import { useLiveCameras } from '../hooks/useLiveCameras';
import { CCTVStatsCards } from '../components/CCTVStatsCards';
import { CCTVRegistration } from '../components/CCTVRegistration';
import hospitalHallwayCctv from '../../../assets/hospital_hallway_cctv.png';
import type { Inquiry, InquiryCategory } from '../../../shared/types/inquiry';
import { STREAM_MODE, cameraLoginIdFor, resolveCameraStream, type LiveCamera } from '../data/cameras';
import { fetchAdminUsers, fetchAdminCompanies, fetchAdminIndividualFacilities, fetchAdminCameraStats, fetchAdminTodayAlertCount, fetchAdminFalsePositiveRate, fetchAdminCamerasByCompany, fetchAdminFacilityCameras, updateAdminMember, type AdminUserResponse, type AdminFacilityCameraResponse, type CorporateCameraResponse, type AdminFalsePositiveRateResponse } from '../api/adminApi';
import { useAiEvents } from '../../../hooks/useAiEvents';
import { isDangerAiEvent, getScenarioPresentation, aiEventFingerprint } from '../../../shared/utils/aiAlerts';
import { fetchAllInquiries, fetchMyInquiries, createInquiry, answerInquiry } from '../api/inquiryApi';
import { logger } from '../../../shared/utils/logger';

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


interface Space {
  id: string;
  label: string;
  type: 'corporate' | 'individual';
  floors: { id: string; label: string; alerts: number }[];
}

type MenuId     = 'home' | 'adminlist' | 'cctvReg' | 'qna' | 'test';
type TestMenuId = 'home' | 'alerts' | 'history' | 'cameras' | 'mypage' | 'qna';
type MypageTab  = 'profile' | 'password' | 'notifications' | 'account';
type MemberStatus = '활성' | '비활성';

interface OrgMember {
  id: string; type: 'corporate';
  orgName: string; representative: string; contact: string;
  email: string; region: string; registeredAt: string;
  cameraCount: number; status: MemberStatus;
}
interface IndividualMember {
  id: string; type: 'individual';
  name: string; contact: string; email: string;
  region: string; registeredAt: string;
  cameraCount: number; status: MemberStatus;
}
type AnyMember = OrgMember | IndividualMember;

function statusToKorean(status: AdminUserResponse['status']): MemberStatus {
  return status === 'ACTIVE' ? '활성' : '비활성';
}

function statusToApi(status: MemberStatus): 'ACTIVE' | 'SUSPENDED' {
  return status === '활성' ? 'ACTIVE' : 'SUSPENDED';
}

function toOrgMember(u: AdminUserResponse): OrgMember {
  return {
    id: String(u.userId),
    type: 'corporate',
    orgName: u.name,
    representative: u.representative ?? '-',
    contact: u.contact ?? '-',
    email: u.email,
    region: u.region ?? '-',
    registeredAt: u.registeredAt,
    cameraCount: u.cameraCount,
    status: statusToKorean(u.status),
  };
}

function toIndividualMember(u: AdminUserResponse): IndividualMember {
  return {
    id: String(u.userId),
    type: 'individual',
    name: u.name,
    contact: u.contact ?? '-',
    email: u.email,
    region: u.region ?? '-',
    registeredAt: u.registeredAt,
    cameraCount: u.cameraCount,
    status: statusToKorean(u.status),
  };
}
const STATUS_STYLE: Record<MemberStatus, string> = {
  '활성':   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  '비활성': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const MENU_ITEMS: { id: MenuId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home',      label: '대시보드 홈', icon: LayoutDashboard },
  { id: 'adminlist', label: '관리 목록',   icon: Users           },
  { id: 'cctvReg',   label: 'CCTV 등록',  icon: Camera          },
  { id: 'qna',       label: '문의',       icon: HelpCircle      },
];

const TEST_MENU_ITEMS: { id: TestMenuId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home',    label: '대시보드 홈', icon: Tv         },
  { id: 'alerts',  label: '이벤트 알림', icon: Bell       },
  { id: 'history', label: '이벤트 기록', icon: Calendar   },
];

const CATEGORY_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  '알림 및 경보':   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  '모바일':         'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '기타':           'bg-slate-500/10 text-slate-400 border-slate-500/20',
};


const TEST_CCTV_FEEDS = [
  { id: 'CCTV-01', name: '방 1',     style: 'brightness-90 contrast-100 hue-rotate-15' },
  { id: 'CCTV-02', name: '복도 A',   style: 'border-2 border-rose-500 animate-pulse', alert: true },
  { id: 'CCTV-03', name: '방 2',     style: 'brightness-105 contrast-95' },
  { id: 'CCTV-04', name: '대기실 1', style: 'saturate-50 contrast-110' },
  { id: 'CCTV-05', name: '대기실 2', style: 'hue-rotate-60' },
  { id: 'CCTV-06', name: '출입구',   style: 'brightness-75' },
  { id: 'CCTV-07', name: '후문',     style: 'brightness-110 contrast-105' },
];

interface TestIncidentAlert {
  id: string; time: string; timestamp: number;
  camera: string; type: string; label: string;
  severity: 'critical' | 'warning' | 'info'; status: 'new' | 'resolved';
}
interface TestRegisteredCamera { id: string; name: string; location: string; password?: string; }
const INITIAL_TEST_CAMERAS: TestRegisteredCamera[] = [
  { id: 'CCTV-01', name: '방 1',   location: '1층', password: 'cam1234'  },
  { id: 'CCTV-02', name: '복도 A', location: '1층', password: 'hall5678' },
  { id: 'CCTV-03', name: '방 2',   location: '1층' },
];
const TEST_MOCK_LOGIN_HISTORY = [
  { date: '2026-05-29 09:42', device: 'Chrome / Windows 11', ip: '192.168.1.×××', status: '성공' },
  { date: '2026-05-28 17:15', device: 'Chrome / Windows 11', ip: '192.168.1.×××', status: '성공' },
  { date: '2026-05-27 08:30', device: 'Safari / macOS',      ip: '192.168.2.×××', status: '성공' },
  { date: '2026-05-26 13:22', device: 'Chrome / Android',    ip: '10.0.0.×××',    status: '실패' },
];
const INQUIRY_CATEGORIES: InquiryCategory[] = ['카메라 및 영상', '알림 및 경보', '모바일', '기타'];
const CATEGORY_ACTIVE_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-600/20 text-blue-300 border-blue-400/50',
  '알림 및 경보':   'bg-rose-600/20 text-rose-300 border-rose-400/50',
  '모바일':         'bg-violet-600/20 text-violet-300 border-violet-400/50',
  '기타':           'bg-slate-600/20 text-slate-300 border-slate-400/50',
};

function testEventBtnStyle(severity: 'critical'|'warning'|'info') {
  if (severity === 'critical') return 'bg-[#ef4444] hover:bg-red-400';
  if (severity === 'warning')  return 'bg-[#f59e0b] hover:bg-amber-400';
  return 'bg-[#334155] hover:bg-slate-500';
}
function getPasswordStrength(pw: string) {
  if (!pw) return { level: 0, label: '', color: '' };
  const score = [pw.length>=8, /[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length;
  if (score<=2) return { level:1, label:'약함',  color:'bg-red-500' };
  if (score<=3) return { level:2, label:'보통',  color:'bg-amber-500' };
  return           { level:3, label:'강함',  color:'bg-emerald-500' };
}
function TestToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function IntegratedDashboard({ onLogout }: IntegratedDashboardProps) {
  const liveCameras = useLiveCameras();
  const [activeMenu, setActiveMenu] = useState<MenuId>('home');
  const [selectedFloor, setSelectedFloor] = useState<'1F' | '2F' | '3F'>('1F');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [corpGroupOpen, setCorpGroupOpen] = useState(false);
  const [indGroupOpen, setIndGroupOpen] = useState(false);
  const [spaceSearch, setSpaceSearch] = useState('');
  const [cameraStats, setCameraStats] = useState<{ totalCount: number; connectedCount: number } | null>(null);
  const [todayAlertCount, setTodayAlertCount] = useState(0);
  const [falsePositiveRate, setFalsePositiveRate] = useState<AdminFalsePositiveRateResponse | null>(null);
  const [spaceViewCameras, setSpaceViewCameras] = useState<CorporateCameraResponse[] | AdminFacilityCameraResponse[]>([]);
  const [spaceViewLoading, setSpaceViewLoading] = useState(false);
  const [spaceSelectedCameraId, setSpaceSelectedCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CCTVCamera[]>(FLOOR_1_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(FLOOR_1_CAMERAS[1]);
const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(70);

  // Admin QnA state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [tMyInquiries, setTMyInquiries] = useState<Inquiry[]>([]);
  const [selectedAdminQnaId, setSelectedAdminQnaId] = useState<number | null>(null);
  const [adminReply, setAdminReply] = useState('');

  // ── 테스트 모드 state ──────────────────────────────────────────────
  const [testSubMenu, setTestSubMenu]         = useState<TestMenuId>('home');
  // alerts / history
  const [resolvedTestAlertIds, setResolvedTestAlertIds] = useState<Set<string>>(() => new Set());
  const [tSearchDate, setTSearchDate]         = useState<'today'|'week'|'month'>('month');
  const [tSearchCamera, setTSearchCamera]     = useState('전체');
  const [tSearchKeyword, setTSearchKeyword]   = useState('');
  const [tSelectedIncident, setTSelectedIncident] = useState<TestIncidentAlert | null>(null);
  const [tIsPlaying, setTIsPlaying]           = useState(true);
  const [tPlaybackSpeed, setTPlaybackSpeed]   = useState(1.0);
  const [tPlaybackProgress, setTPlaybackProgress] = useState(30);
  const [tPlaybackVolume, setTPlaybackVolume] = useState(80);
  // cameras
  const [tCameras, setTCameras]               = useState<TestRegisteredCamera[]>(INITIAL_TEST_CAMERAS);
  const [tShowAddCamera, setTShowAddCamera]   = useState(false);
  const [tNewCamName, setTNewCamName]         = useState('');
  const [tNewCamId, setTNewCamId]             = useState('');
  const [tNewCamLocation, setTNewCamLocation] = useState('');
  const [tNewCamPassword, setTNewCamPassword] = useState('');
  const [tShowNewCamPw, setTShowNewCamPw]     = useState(false);
  const [tShowCamPwId, setTShowCamPwId]       = useState<string | null>(null);
  // mypage
  const [tMypageTab, setTMypageTab]           = useState<MypageTab>('profile');
  const [tProfileName, setTProfileName]       = useState('테스트 관리자');
  const [tProfileEmail, setTProfileEmail]     = useState('admin@test.com');
  const [tProfilePhone, setTProfilePhone]     = useState('010-0000-0000');
  const [tCurrentPw, setTCurrentPw]           = useState('');
  const [tNewPw, setTNewPw]                   = useState('');
  const [tConfirmPw, setTConfirmPw]           = useState('');
  const [tShowCurrentPw, setTShowCurrentPw]   = useState(false);
  const [tShowNewPw, setTShowNewPw]           = useState(false);
  const [tShowConfirmPw, setTShowConfirmPw]   = useState(false);
  const [tNotifEvent, setTNotifEvent]         = useState(true);
  const [tNotifEmail, setTNotifEmail]         = useState(true);
  const [tNotifSms, setTNotifSms]             = useState(false);
  const [tAlertLevel, setTAlertLevel]         = useState<'all'|'warning'|'critical'>('warning');
  // qna (user perspective)
  const [tSelectedQnaId, setTSelectedQnaId]   = useState<number | null>(null);
  const [tShowNewQnaModal, setTShowNewQnaModal] = useState(false);
  const [tQnaTitle, setTQnaTitle]             = useState('');
  const [tQnaContent, setTQnaContent]         = useState('');
  const [tQnaCategory, setTQnaCategory]       = useState<InquiryCategory>('기타');

  const isTestMode = activeMenu === 'test';
  const testAiFeed = useAiEvents({ enabled: activeMenu === 'test' });

  const selectedSpace = useMemo(() => spaces.find(s => s.id === selectedSpaceId), [spaces, selectedSpaceId]);
  const tAlerts: TestIncidentAlert[] = useMemo(() => testAiFeed.events
    .filter(isDangerAiEvent)
    .map(event => {
      const fingerprint = aiEventFingerprint(event);
      const eventType = event.scenarioType!;
      const presentation = getScenarioPresentation(eventType);
      return {
        id: fingerprint,
        time: new Date(event.timestamp * 1000).toTimeString().split(' ')[0],
        timestamp: event.timestamp * 1000,
        camera: event.camera_login_id ?? event.camera_id,
        type: eventType,
        label: presentation.label,
        severity: presentation.tone,
        status: resolvedTestAlertIds.has(fingerprint) ? 'resolved' as const : 'new' as const,
      };
    }), [testAiFeed.events, resolvedTestAlertIds]);
  const tActiveTenMin = tAlerts.filter(a => Date.now() - a.timestamp <= 10*60*1000);
  const tFilteredHistory = tAlerts.filter(a => {
    if (tSearchKeyword && !a.label.toLowerCase().includes(tSearchKeyword.toLowerCase()) && !a.camera.includes(tSearchKeyword)) return false;
    if (tSearchCamera !== '전체' && a.camera !== tSearchCamera) return false;
    const age = Date.now() - a.timestamp;
    if (tSearchDate === 'today' && age > 86400000) return false;
    if (tSearchDate === 'week'  && age > 7*86400000) return false;
    if (tSearchDate === 'month' && age > 30*86400000) return false;
    return true;
  });
  const tSelectedQna = tMyInquiries.find(i => i.id === tSelectedQnaId) ?? null;
  const tPwStrength  = getPasswordStrength(tNewPw);

  const handleTResolveAlert = (id: string) =>
    setResolvedTestAlertIds(prev => new Set(prev).add(id));
  const handleTAddCamera = () => {
    if (!tNewCamName.trim() || !tNewCamId.trim()) return;
    setTCameras(prev => [...prev, { id: tNewCamId.trim(), name: tNewCamName.trim(), location: tNewCamLocation.trim()||'미지정', password: tNewCamPassword.trim()||undefined }]);
    setTNewCamName(''); setTNewCamId(''); setTNewCamLocation(''); setTNewCamPassword('');
    setTShowNewCamPw(false); setTShowAddCamera(false);
  };
  const handleTSubmitQna = async () => {
    if (!tQnaTitle.trim() || !tQnaContent.trim()) return;
    try {
      await createInquiry(tQnaCategory, tQnaTitle.trim(), tQnaContent.trim());
      loadTestInquiries();
    } catch {
      logger.error('[TestQna] create failed.');
    }
    setTQnaTitle(''); setTQnaContent(''); setTQnaCategory('기타'); setTShowNewQnaModal(false);
  };

  // 관리 목록 state
  const [adminTab, setAdminTab]             = useState<'corporate' | 'individual'>('corporate');
  const [adminSearch, setAdminSearch]       = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<MemberStatus | '전체'>('전체');
  const [editingMember, setEditingMember]   = useState<AnyMember | null>(null);
  const [editStatus, setEditStatus]         = useState<MemberStatus>('활성');
  const [editName, setEditName]             = useState('');
  const [editRepresentative, setEditRepresentative] = useState('');
  const [editContact, setEditContact]       = useState('');
  const [editRegion, setEditRegion]         = useState('');
  const [editSaving, setEditSaving]         = useState(false);
  const [editError, setEditError]           = useState<string | null>(null);
  const [orgList, setOrgList]               = useState<OrgMember[]>([]);
  const [indList, setIndList]               = useState<IndividualMember[]>([]);
  const [adminLoading, setAdminLoading]     = useState(false);
  const [adminError, setAdminError]         = useState<string | null>(null);

  useEffect(() => {
    setSpacesLoading(true);
    Promise.all([fetchAdminCompanies(), fetchAdminIndividualFacilities()])
      .then(([companies, facilities]) => {
        const corpSpaces: Space[] = companies.map(c => ({
          id: `corp-${c.companyProfileId}`,
          label: c.companyName,
          type: 'corporate',
          floors: [],
        }));
        const indSpaces: Space[] = facilities.map(f => ({
          id: `ind-${f.facilityId}`,
          label: f.facilityName,
          type: 'individual',
          floors: [],
        }));
        const all = [...corpSpaces, ...indSpaces];
        setSpaces(all);
        if (all.length > 0) setSelectedSpaceId(all[0].id);
      })
      .catch((err: unknown) => console.error('[Spaces] fetch failed:', err))
      .finally(() => setSpacesLoading(false));
  }, []);

  const refetchSpaceCameras = useCallback(() => {
    if (!selectedSpaceId) return;
    const space = spaces.find(s => s.id === selectedSpaceId);
    if (!space) return;
    const numericId = Number(space.id.split('-')[1]);
    const fetcher = space.type === 'corporate'
      ? fetchAdminCamerasByCompany(numericId)
      : fetchAdminFacilityCameras(numericId);
    fetcher
      .then(cams => setSpaceViewCameras(cams as CorporateCameraResponse[] | AdminFacilityCameraResponse[]))
      .catch((err: unknown) => console.error('[SpaceView] refetch failed:', err));
  }, [selectedSpaceId, spaces]);

  useEffect(() => {
    if (!selectedSpaceId) return;
    const space = spaces.find(s => s.id === selectedSpaceId);
    if (!space) return;

    setSpaceViewLoading(true);
    setSpaceViewCameras([]);
    setSpaceSelectedCameraId(null);

    const numericId = Number(space.id.split('-')[1]);
    const fetcher = space.type === 'corporate'
      ? fetchAdminCamerasByCompany(numericId)
      : fetchAdminFacilityCameras(numericId);

    fetcher
      .then(cams => setSpaceViewCameras(cams as CorporateCameraResponse[] | AdminFacilityCameraResponse[]))
      .catch((err: unknown) => console.error('[SpaceView] fetch failed:', err))
      .finally(() => setSpaceViewLoading(false));
  }, [selectedSpaceId]);

  useEffect(() => {
    Promise.all([fetchAdminCameraStats(), fetchAdminTodayAlertCount(), fetchAdminFalsePositiveRate()])
      .then(([stats, alertData, fpRate]) => {
        setCameraStats(stats);
        setTodayAlertCount(alertData.count);
        setFalsePositiveRate(fpRate);
      })
      .catch((err: unknown) => console.error('[Stats] fetch failed:', err));
  }, []);

  const loadAdminUsers = useCallback(() => {
    setAdminLoading(true);
    return fetchAdminUsers()
      .then(page => {
        setOrgList(page.content.filter(u => u.role === 'CORPORATE').map(toOrgMember));
        setIndList(page.content.filter(u => u.role === 'INDIVIDUAL').map(toIndividualMember));
        setAdminError(null);
      })
      .catch(() => {
        logger.error('[AdminList] fetch failed.');
        setAdminError('회원 목록을 불러오지 못했습니다.');
      })
      .finally(() => setAdminLoading(false));
  }, []);

  useEffect(() => {
    loadAdminUsers();
  }, [loadAdminUsers]);

  useEffect(() => {
    fetchAllInquiries()
      .then(setInquiries)
      .catch(() => logger.error('[AdminQna] fetch failed.'));
  }, []);

  const loadTestInquiries = () => {
    fetchMyInquiries()
      .then(setTMyInquiries)
      .catch(() => logger.error('[TestQna] fetch failed.'));
  };

  const selectedAdminQna = inquiries.find(inq => inq.id === selectedAdminQnaId) ?? null;
  const unansweredCount = inquiries.filter(i => i.status === 'WAITING').length;
  const answeredCount = inquiries.filter(i => i.status === 'COMPLETED').length;

  useEffect(() => {
    if (selectedFloor === '1F') { setCameras(FLOOR_1_CAMERAS); setSelectedCamera(FLOOR_1_CAMERAS[1]); }
    else if (selectedFloor === '2F') { setCameras(FLOOR_2_CAMERAS); setSelectedCamera(FLOOR_2_CAMERAS[3]); }
    else { setCameras(FLOOR_3_CAMERAS); setSelectedCamera(FLOOR_3_CAMERAS[1]); }
  }, [selectedFloor]);

  const handleCameraClick = useCallback((cam: CCTVCamera) => setSelectedCamera(cam), []);

const handleSubmitReply = async () => {
    if (!adminReply.trim() || !selectedAdminQnaId) return;
    try {
      await answerInquiry(selectedAdminQnaId, adminReply.trim());
      const updated = await fetchAllInquiries();
      setInquiries(updated);
    } catch {
      logger.error('[AdminQna] answer failed.');
    }
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
          {isTestMode ? (
            <button
              onClick={() => { setActiveMenu('home'); setTestSubMenu('home'); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600/10 border border-rose-500/40 text-[11px] font-bold text-rose-400 hover:bg-rose-600/20 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> 테스트 종료
            </button>
          ) : (
            <button
              onClick={() => { setActiveMenu('test'); setTestSubMenu('home'); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-700 border border-blue-500/20 text-[11px] font-bold text-white cursor-pointer"
            >
              <Beaker className="w-3.5 h-3.5" /> 테스트 모드
            </button>
          )}
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
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">공간 선택</h3>

              {spacesLoading ? (
                <div className="px-3 py-2 text-[10px] text-slate-500 animate-pulse">공간 목록 로딩 중…</div>
              ) : (
                <div className="space-y-1.5">

                  {/* 통합 검색창 */}
                  {spaces.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-500" />
                      <input
                        type="text"
                        value={spaceSearch}
                        onChange={e => setSpaceSearch(e.target.value)}
                        placeholder="기업 · 시설 검색…"
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] text-slate-300 placeholder-slate-600 outline-none focus:border-slate-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1">

                    {/* 기업 공간 그룹 */}
                    {(() => {
                      const corpTotal = spaces.filter(s => s.type === 'corporate').length;
                      const filteredCorp = spaces
                        .filter(s => s.type === 'corporate')
                        .filter(s => s.label.toLowerCase().includes(spaceSearch.toLowerCase()));
                      if (spaceSearch && filteredCorp.length === 0) return null;
                      return (
                        <div>
                          <button
                            onClick={() => setCorpGroupOpen(o => !o)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/5 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3" />
                              <span>단체 시설</span>
                              <span className="bg-blue-500/15 px-1.5 py-0.5 rounded text-[9px]">
                                {spaceSearch ? filteredCorp.length : corpTotal}
                              </span>
                            </div>
                            {corpGroupOpen
                              ? <ChevronDown className="w-3 h-3 text-slate-500" />
                              : <ChevronRight className="w-3 h-3 text-slate-500" />
                            }
                          </button>

                          {corpGroupOpen && (
                            <div className="mt-0.5 space-y-0.5">
                              {corpTotal === 0 ? (
                                <div className="px-3 py-1.5 text-[10px] text-slate-600">등록된 기업이 없습니다.</div>
                              ) : filteredCorp.map(space => (
                                <button
                                  key={space.id}
                                  onClick={() => setSelectedSpaceId(space.id)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                                    selectedSpaceId === space.id
                                      ? 'bg-blue-600/15 border border-blue-500/20 text-white'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 border border-transparent'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedSpaceId === space.id ? 'bg-blue-500' : 'bg-slate-600'}`} />
                                  <span className="truncate">{space.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 개인 시설 그룹 */}
                    {(() => {
                      const indTotal = spaces.filter(s => s.type === 'individual').length;
                      const filteredInd = spaces
                        .filter(s => s.type === 'individual')
                        .filter(s => s.label.toLowerCase().includes(spaceSearch.toLowerCase()));
                      if (spaceSearch && filteredInd.length === 0) return null;
                      return (
                        <div>
                          <button
                            onClick={() => setIndGroupOpen(o => !o)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <Folder className="w-3 h-3" />
                              <span>개인 시설</span>
                              <span className="bg-emerald-500/15 px-1.5 py-0.5 rounded text-[9px]">
                                {spaceSearch ? filteredInd.length : indTotal}
                              </span>
                            </div>
                            {indGroupOpen
                              ? <ChevronDown className="w-3 h-3 text-slate-500" />
                              : <ChevronRight className="w-3 h-3 text-slate-500" />
                            }
                          </button>

                          {indGroupOpen && (
                            <div className="mt-0.5 space-y-0.5">
                              {indTotal === 0 ? (
                                <div className="px-3 py-1.5 text-[10px] text-slate-600">등록된 개인 시설이 없습니다.</div>
                              ) : filteredInd.map(space => (
                                <button
                                  key={space.id}
                                  onClick={() => setSelectedSpaceId(space.id)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                                    selectedSpaceId === space.id
                                      ? 'bg-emerald-600/15 border border-emerald-500/20 text-white'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 border border-transparent'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedSpaceId === space.id ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                  <span className="truncate">{space.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 검색 결과 없음 */}
                    {spaceSearch && spaces.filter(s => s.label.toLowerCase().includes(spaceSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-slate-600">검색 결과 없음</div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* 메뉴 탐색 */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isTestMode ? '테스트 메뉴' : '메뉴 탐색'}
              </h3>
              <nav className="space-y-0.5">
                {isTestMode
                  ? TEST_MENU_ITEMS.map(({ id, label, icon: Icon }) => {
                      const isActive = testSubMenu === id;
                      const badge = id === 'alerts' ? tActiveTenMin.length : undefined;
                      return (
                        <button
                          key={id}
                          onClick={() => { setTestSubMenu(id); if (id === 'qna') loadTestInquiries(); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive ? 'bg-[#0758D6] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            {label}
                          </div>
                          {badge !== undefined && badge > 0 && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-[#0758D6]' : 'bg-rose-500 text-white'}`}>
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })
                  : MENU_ITEMS.map(({ id, label, icon: Icon }) => {
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
                    })
                }
              </nav>
            </div>

          </div>

        </aside>

        {/* ===== CENTER ===== */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* HOME view */}
          {activeMenu === 'home' && (() => {
            // ── 기업 공간 뷰 ──────────────────────────────────────────
            if (selectedSpace?.type === 'corporate') {
              const corpCameras = spaceViewCameras as CorporateCameraResponse[];
              const selectedCorp = corpCameras.find(c => String(c.cameraId) === spaceSelectedCameraId);
              const corpCameraLoginId = selectedCorp
                ? cameraLoginIdFor(selectedCorp.cameraLoginId, selectedCorp.cameraId)
                : '';
              const corpResolvedStream = selectedCorp
                ? resolveCameraStream(corpCameraLoginId, selectedCorp)
                : null;
              const corpLiveCamera: LiveCamera | null = selectedCorp ? {
                id: corpCameraLoginId,
                cameraLoginId: corpCameraLoginId,
                cameraDbId: String(selectedCorp.cameraId),
                name: selectedCorp.cameraName,
                location: selectedCorp.locationDescription ?? '',
                streamUrl: corpResolvedStream!.streamUrl,
                streamMode: STREAM_MODE,
                streamKind: corpResolvedStream!.streamKind,
                connectionStatus: selectedCorp.connectionStatus === 'CONNECTED' ? 'online'
                  : selectedCorp.connectionStatus === 'RECONNECTING' ? 'connecting' : 'offline',
                eventStatus: 'normal',
                overlayUrl: selectedCorp.overlayUrl,
                overlayStreamType: selectedCorp.overlayStreamType,
                overlayRenderedInStream: selectedCorp.overlayRenderedInStream,
              } : null;

              return (
                <div className="flex-1 p-4 gap-4 overflow-y-auto flex flex-col">
                  {spaceViewLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm animate-pulse">카메라 목록 로딩 중…</div>
                  ) : (
                    <>
                      <div className="h-[380px] min-h-[380px]">
                        <CorporateFloorPlan
                          cameras={corpCameras}
                          selectedCameraId={spaceSelectedCameraId}
                          onCameraSelect={setSpaceSelectedCameraId}
                          onRefresh={refetchSpaceCameras}
                        />
                      </div>
                      <div className="bg-[#071329] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 bg-[#061224] border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold">보조 모니터링: </span>
                            <h2 className="text-xs font-extrabold text-white">
                              {selectedCorp ? `${selectedCorp.cameraName}${selectedCorp.locationDescription ? ` — ${selectedCorp.locationDescription}` : ''}` : '도면에서 카메라를 선택하세요'}
                            </h2>
                            {selectedCorp && (
                              <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold border border-emerald-500/15">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> 실시간 RTSP
                              </div>
                            )}
                          </div>
                          <Maximize2 className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
                        </div>
                        <div className="relative bg-black overflow-hidden p-3 min-h-[160px]">
                          {corpLiveCamera ? (
                            <>
                              <LiveCameraGrid cameras={[corpLiveCamera]} compact />
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
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
                              도면에서 카메라 아이콘을 클릭하면 영상이 표시됩니다
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            // ── 개인 시설 뷰 ──────────────────────────────────────────
            if (selectedSpace?.type === 'individual') {
              const indCameras = spaceViewCameras as AdminFacilityCameraResponse[];
              const individualLiveCameras: LiveCamera[] = indCameras.map(cam => {
                const cameraLoginId = cameraLoginIdFor(cam.cameraLoginId, cam.cameraId);
                const resolvedStream = resolveCameraStream(cameraLoginId, cam);
                return {
                  id: cameraLoginId,
                  cameraLoginId,
                  cameraDbId: String(cam.cameraId),
                  name: cam.cameraName,
                  location: cam.locationDescription ?? '',
                  streamUrl: resolvedStream.streamUrl,
                  streamMode: STREAM_MODE,
                  streamKind: resolvedStream.streamKind,
                  connectionStatus: cam.connectionStatus === 'CONNECTED' ? 'online'
                    : cam.connectionStatus === 'RECONNECTING' ? 'connecting' : 'offline',
                  eventStatus: 'normal' as const,
                  overlayUrl: cam.overlayUrl,
                  overlayStreamType: cam.overlayStreamType,
                  overlayRenderedInStream: cam.overlayRenderedInStream,
                };
              });

              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2 flex-shrink-0">
                    <h2 className="text-xs font-extrabold text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-400" />
                      {selectedSpace.label} — 카메라 모니터링
                    </h2>
                    <span className="text-[10px] text-slate-400 font-semibold">총 {indCameras.length}대</span>
                  </div>
                  {spaceViewLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm animate-pulse">카메라 목록 로딩 중…</div>
                  ) : indCameras.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">등록된 카메라가 없습니다</div>
                  ) : (
                    <div className="flex-1 p-4 pt-2 overflow-hidden">
                      <LiveCameraGrid cameras={individualLiveCameras} />
                    </div>
                  )}
                </div>
              );
            }

            // ── 공간 미선택 기본 화면 ──────────────────────────────────
            return (
              <div className="flex-1 p-4 gap-4 overflow-y-auto flex flex-col">
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
            );
          })()}

          {/* ===== TEST MODE VIEWS ===== */}
          {/* TEST HOME */}
          {isTestMode && testSubMenu === 'home' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-400" />
                    실시간 CCTV 모니터링
                  </h2>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">전 노드 연결 정상</span>
                </div>
                <LiveCameraGrid cameras={liveCameras} onCameraClick={camera => {
                  const event = tAlerts.find(a => a.camera === camera.location || a.camera === camera.name);
                  if (event) setTSelectedIncident(event);
                }} />
              </div>
              <div className="w-72 bg-[#020817] border-l border-slate-800/50 flex flex-col flex-shrink-0">
                <div className="flex-1 bg-[#071329] m-3 mb-0 rounded-xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800/50"><h3 className="text-base font-bold text-white">실시간 AI 위험 탐지</h3></div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {tAlerts.slice(0,5).map(evt => (
                      <div key={evt.id} className={`bg-[#0f172a] rounded-xl p-3 flex items-center gap-3 ${evt.status==='resolved'?'opacity-50':''}`}>
                        <div className="w-12 h-12 bg-[#374151] rounded-lg flex-shrink-0 overflow-hidden">
                          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-[9px] font-bold text-slate-500">LIVE</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm leading-tight cursor-pointer hover:underline truncate" onClick={() => setTSelectedIncident(evt)}>{evt.type} 감지</p>
                          <p className="text-[#cbd5e1] text-xs mt-0.5">{evt.time}</p>
                        </div>
                        {evt.status==='new'
                          ? <button onClick={() => handleTResolveAlert(evt.id)} className={`${testEventBtnStyle(evt.severity)} text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 cursor-pointer`}>확인</button>
                          : <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { const ok=window.confirm('🚨 [긴급] 비상 출동을 발령하시겠습니까?'); if(ok) alert('비상 출동 명령이 전달되었습니다.'); }} className="mx-3 my-3 py-4 bg-[#dc2626] hover:bg-red-500 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <Flame className="w-4 h-4 fill-white/20" /> 비상 출동
                </button>
              </div>
            </div>
          )}

          {/* TEST ALERTS */}
          {isTestMode && testSubMenu === 'alerts' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-white">이벤트 알림 피드 (최근 10분)</h2>
                  <p className="text-xs text-slate-400 mt-1">골든타임 대응을 위해 최근 10분 내 발생한 위급 이상 행동만 표기합니다.</p>
                </div>
                <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold rounded-full text-xs">진행 위험: {tActiveTenMin.length}건</span>
              </div>
              {tActiveTenMin.length === 0 ? (
                <div className="py-16 text-center bg-[#071329] border border-dashed border-slate-800 rounded-2xl">
                  <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-500">최근 10분 동안 감지된 활성 위급 경보가 없습니다.</p>
                </div>
              ) : tActiveTenMin.map(alert => {
                const elapsedMs = Date.now()-alert.timestamp;
                const elapsedMins = Math.floor(elapsedMs/60000), elapsedSecs = Math.floor((elapsedMs%60000)/1000);
                const remaining = 10*60*1000-elapsedMs;
                const remMins = Math.floor(remaining/60000), remSecs = Math.floor((remaining%60000)/1000);
                return (
                  <div key={alert.id} className={`bg-[#071329] border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${alert.severity==='critical'?'border-rose-500/80':'border-amber-500/50'}`}>
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2"><span className="text-xs font-extrabold text-white">{alert.label}</span><span className="text-[9px] text-slate-400 font-mono">[{alert.camera}]</span></div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {alert.time}</span>
                          <span className="text-rose-400 font-semibold">{elapsedMins}분 {elapsedSecs}초 경과</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-mono">{remMins}분 {remSecs}초 후 소멸</span>
                      <button onClick={() => setTSelectedIncident(alert)} className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold cursor-pointer">녹화 재생</button>
                      {alert.status==='new' && <button onClick={() => handleTResolveAlert(alert.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer">조치 해제</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TEST HISTORY */}
          {isTestMode && testSubMenu === 'history' && (
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
                      {[{id:'today',label:'오늘'},{id:'week',label:'1주일'},{id:'month',label:'1개월'}].map(p => (
                        <button key={p.id} onClick={() => setTSearchDate(p.id as any)} className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer ${tSearchDate===p.id?'bg-blue-600/10 border-blue-500 text-blue-400':'border-slate-800 text-slate-400 hover:border-slate-700'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">CCTV 채널</label>
                    <select value={tSearchCamera} onChange={e => setTSearchCamera(e.target.value)} className="w-full px-3 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-slate-300">
                      <option value="전체">전체 카메라</option>
                      {TEST_CCTV_FEEDS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">키워드</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input type="text" value={tSearchKeyword} onChange={e => setTSearchKeyword(e.target.value)} placeholder="FALL, 낙상, 복도…" className="w-full pl-9 pr-4 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-5 py-3 bg-slate-900/30 border-b border-slate-800 flex justify-between text-xs text-slate-400">
                  <span className="font-semibold">검색 내역 ({tFilteredHistory.length}건)</span>
                  <span className="text-[10px]">최근 30일 아카이빙 보관 중</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                  {tFilteredHistory.length === 0
                    ? <div className="py-20 text-center"><p className="text-xs text-slate-500">해당 조건의 녹화 기록이 없습니다.</p></div>
                    : tFilteredHistory.map(log => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-800/10">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400"><Video className="w-4 h-4" /></div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{log.label}</h4>
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-1 font-mono">
                              <span>위치: {log.camera}</span><span>•</span>
                              <span>2026-05-{log.timestamp%2===0?'25':'26'} {log.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setTSelectedIncident(log)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] cursor-pointer">비디오 확인</button>
                          <button onClick={() => alert('MP4 저장 완료')} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 cursor-pointer"><Download className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* TEST CAMERAS */}
          {isTestMode && testSubMenu === 'cameras' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">카메라 등록 / 관리</h2>
                  <p className="text-xs text-slate-400 mt-1">관제 구역 내 CCTV 카메라를 등록하고 관리합니다.</p>
                </div>
                <button onClick={() => setTShowAddCamera(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> 카메라 추가
                </button>
              </div>
              <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">등록된 카메라</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {tCameras.map(cam => (
                    <div key={cam.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden group">
                      <div className="relative aspect-video">
                        <img src={liveCameras.find(f=>f.name===cam.id)?.streamUrl||liveCameras[0]?.streamUrl} alt={cam.name} className="w-full h-full object-cover opacity-75 brightness-75" />
                        <div className="absolute top-2 left-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /><span className="text-[9px] text-rose-400 font-bold">LIVE</span></div>
                        <button onClick={() => setTCameras(prev=>prev.filter(c=>c.id!==cam.id))} className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-red-600 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-white font-bold text-sm">{cam.name}</p>
                        <p className="text-slate-400 text-xs">{cam.id} · {cam.location}</p>
                      </div>
                    </div>
                  ))}
                  {Array(Math.max(0, 6 - tCameras.length)).fill(null).map((_, i) => (
                    <div key={i} className="bg-[#111827] border border-dashed border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500" onClick={() => setTShowAddCamera(true)}>
                      <div className="w-14 h-14 rounded-full bg-[#d9d9d9]/10 flex items-center justify-center"><Plus className="w-7 h-7 text-slate-400" /></div>
                      <span className="text-slate-500 text-xs font-medium">카메라 추가</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEST QNA (user perspective) */}
          {isTestMode && testSubMenu === 'qna' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-80 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-extrabold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400"/>내 문의 내역</h2>
                    <button onClick={() => setTShowNewQnaModal(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3"/>새 문의</button>
                  </div>
                  <p className="text-[10px] text-slate-500">총 {tMyInquiries.length}건 · 미답변 {tMyInquiries.filter(i=>i.status==='WAITING').length}건</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {tMyInquiries.length === 0
                    ? <div className="py-14 text-center"><MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2"/><p className="text-xs text-slate-500 font-semibold">문의 내역이 없습니다.</p><p className="text-[10px] text-slate-600 mt-1">새 문의를 작성해 보세요.</p></div>
                    : tMyInquiries.map(inq => (
                      <button key={inq.id} onClick={() => setTSelectedQnaId(inq.id)} className={`w-full text-left bg-[#071329] border rounded-xl p-3 cursor-pointer ${tSelectedQnaId===inq.id?'border-blue-500/50 bg-blue-600/5':'border-slate-800 hover:border-slate-700'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[inq.category]}`}>{inq.category}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${inq.status==='COMPLETED'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{inq.status==='COMPLETED'?<><Check className="w-2.5 h-2.5"/>답변완료</>:'미답변'}</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{inq.title}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{inq.createdAt}</p>
                      </button>
                    ))
                  }
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {tSelectedQna ? (
                  <div className="max-w-2xl space-y-6">
                    <button onClick={() => setTSelectedQnaId(null)} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white cursor-pointer"><ChevronLeft className="w-3.5 h-3.5"/>목록으로</button>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 bg-[#061224] border-b border-slate-800">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[tSelectedQna.category]}`}>{tSelectedQna.category}</span>
                        <h3 className="text-sm font-extrabold text-white mt-2">{tSelectedQna.title}</h3>
                        <p className="text-[10px] text-slate-500 mt-1.5">작성일: {tSelectedQna.createdAt}</p>
                      </div>
                      <div className="p-5"><p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{tSelectedQna.content}</p></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-4"><span className="h-px flex-1 bg-slate-800"/><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관리자 답변</span><span className="h-px flex-1 bg-slate-800"/></div>
                      {tSelectedQna.status === 'COMPLETED' && tSelectedQna.replyContent
                        ? <div className="bg-[#0f192b] border border-blue-500/20 rounded-2xl p-5"><div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center"><Shield className="w-3 h-3 text-blue-400"/></div><span className="text-xs font-bold text-blue-400">관리자</span><span className="text-[10px] text-slate-500">{tSelectedQna.repliedAt}</span></div><p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{tSelectedQna.replyContent}</p></div>
                        : <div className="bg-[#071329] border border-dashed border-slate-700 rounded-2xl p-10 text-center"><Clock className="w-8 h-8 text-slate-600 mx-auto mb-2"/><p className="text-xs text-slate-500 font-semibold">답변 대기 중입니다.</p><p className="text-[10px] text-slate-600 mt-1">관리자가 확인 후 빠른 시일 내에 답변드릴 예정입니다.</p></div>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                      <p className="text-sm font-semibold">문의를 선택하거나 새 문의를 작성해 주세요.</p>
                      <button onClick={() => setTShowNewQnaModal(true)} className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5"/>새 문의 작성</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEST MYPAGE */}
          {isTestMode && testSubMenu === 'mypage' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left tab navigation */}
              <div className="w-52 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0 p-4">
                <div className="flex items-center gap-2 mb-5 px-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-extrabold text-blue-400">
                    {tProfileName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{tProfileName}</p>
                    <p className="text-[10px] text-slate-500">최고 관리자</p>
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
                      onClick={() => setTMypageTab(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tMypageTab === id ? 'bg-[#0758D6] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
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

                {/* 프로필 정보 */}
                {tMypageTab === 'profile' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">프로필 정보</h2>
                      <p className="text-xs text-slate-400 mt-1">이름, 연락처 등 기본 정보를 수정합니다.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-2xl font-extrabold text-blue-400">
                        {tProfileName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{tProfileName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">최고 관리자</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">가입일: 2026-03-15</p>
                      </div>
                    </div>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><User className="w-3 h-3" />이름</label>
                        <input value={tProfileName} onChange={e => setTProfileName(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />이메일</label>
                        <input value={tProfileEmail} onChange={e => setTProfileEmail(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />전화번호</label>
                        <input value={tProfilePhone} onChange={e => setTProfilePhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                      </div>
                      <div className="pt-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">계정 유형</label>
                          <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">최고 관리자 (테스트)</div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">아이디</label>
                          <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">admin-test</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => alert('프로필 정보가 저장되었습니다.')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      저장하기
                    </button>
                  </div>
                )}

                {/* 비밀번호 변경 */}
                {tMypageTab === 'password' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">비밀번호 변경</h2>
                      <p className="text-xs text-slate-400 mt-1">보안을 위해 정기적으로 비밀번호를 변경해 주세요.</p>
                    </div>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">현재 비밀번호</label>
                        <div className="relative">
                          <input type={tShowCurrentPw ? 'text' : 'password'} value={tCurrentPw} onChange={e => setTCurrentPw(e.target.value)} placeholder="현재 비밀번호 입력" className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                          <button onClick={() => setTShowCurrentPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {tShowCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">새 비밀번호</label>
                        <div className="relative">
                          <input type={tShowNewPw ? 'text' : 'password'} value={tNewPw} onChange={e => setTNewPw(e.target.value)} placeholder="8자 이상, 영문/숫자/특수문자 혼합" className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                          <button onClick={() => setTShowNewPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {tShowNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {tNewPw && (
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              {[1, 2, 3].map(n => (
                                <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${tPwStrength.level >= n ? tPwStrength.color : 'bg-slate-800'}`} />
                              ))}
                            </div>
                            <p className={`text-[10px] font-semibold ${tPwStrength.level === 1 ? 'text-red-400' : tPwStrength.level === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              비밀번호 강도: {tPwStrength.label}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">새 비밀번호 확인</label>
                        <div className="relative">
                          <input type={tShowConfirmPw ? 'text' : 'password'} value={tConfirmPw} onChange={e => setTConfirmPw(e.target.value)} placeholder="새 비밀번호 재입력" className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                          <button onClick={() => setTShowConfirmPw(p => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                            {tShowConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {tConfirmPw && tNewPw !== tConfirmPw && <p className="text-[10px] text-red-400 font-semibold">비밀번호가 일치하지 않습니다.</p>}
                        {tConfirmPw && tNewPw === tConfirmPw && <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> 비밀번호가 일치합니다.</p>}
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        · 비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.<br />
                        · 변경 후 모든 기기에서 재로그인이 필요합니다.
                      </p>
                    </div>
                    <button onClick={() => { if (!tCurrentPw) { alert('현재 비밀번호를 입력해주세요.'); return; } if (tNewPw !== tConfirmPw) { alert('새 비밀번호가 일치하지 않습니다.'); return; } alert('비밀번호가 변경되었습니다.'); setTCurrentPw(''); setTNewPw(''); setTConfirmPw(''); }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      비밀번호 변경
                    </button>
                  </div>
                )}

                {/* 알림 설정 */}
                {tMypageTab === 'notifications' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">알림 설정</h2>
                      <p className="text-xs text-slate-400 mt-1">이벤트 경보 및 알림 수신 방식을 설정합니다.</p>
                    </div>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl divide-y divide-slate-800/80">
                      {[
                        { label: '이벤트 경보 알림', desc: '낙상·실신 등 위험 이벤트 감지 시 즉시 알림', icon: Bell,       value: tNotifEvent, onChange: setTNotifEvent },
                        { label: '이메일 알림',      desc: '등록된 이메일로 이벤트 요약 발송',           icon: Mail,       value: tNotifEmail, onChange: setTNotifEmail },
                        { label: 'SMS 알림',         desc: '등록된 전화번호로 긴급 경보 문자 발송',     icon: Smartphone, value: tNotifSms,   onChange: setTNotifSms  },
                      ].map(({ label, desc, icon: Icon, value, onChange }) => (
                        <div key={label} className="flex items-center justify-between p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-white">{label}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <TestToggle value={value} onChange={onChange} />
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-white">알림 민감도</p>
                      <p className="text-[10px] text-slate-400">수신할 최소 경보 수준을 선택합니다.</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {([
                          { id: 'all',      label: '전체',      desc: 'info 이상'    },
                          { id: 'warning',  label: '중요 이상', desc: 'warning 이상' },
                          { id: 'critical', label: '긴급만',    desc: 'critical'     },
                        ] as { id: typeof tAlertLevel; label: string; desc: string }[]).map(opt => (
                          <button key={opt.id} onClick={() => setTAlertLevel(opt.id)} className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${tAlertLevel === opt.id ? 'bg-blue-600/15 border-blue-500/40 text-blue-300' : 'bg-[#020817] border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                            <p>{opt.label}</p>
                            <p className="text-[9px] font-normal mt-0.5 opacity-60">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => alert('알림 설정이 저장되었습니다.')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      저장하기
                    </button>
                  </div>
                )}

                {/* 계정 관리 */}
                {tMypageTab === 'account' && (
                  <div className="max-w-xl space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-white">계정 관리</h2>
                      <p className="text-xs text-slate-400 mt-1">로그인 기록 확인 및 계정 설정을 관리합니다.</p>
                    </div>
                    <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                        <LogIn className="w-3.5 h-3.5 text-slate-400" />
                        <h3 className="text-xs font-bold text-white">최근 로그인 기록</h3>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {TEST_MOCK_LOGIN_HISTORY.map((log, i) => (
                          <div key={i} className="px-5 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-300">{log.device}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-mono">{log.date}</span>
                                <span>·</span>
                                <span className="font-mono">{log.ip}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${log.status === '성공' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{log.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
                      <h3 className="text-xs font-bold text-red-400">위험 구역</h3>
                      <p className="text-[10px] text-slate-400">계정을 탈퇴하면 모든 데이터가 영구 삭제되며 복구할 수 없습니다.</p>
                      <button onClick={() => { if (window.confirm('정말로 계정을 탈퇴하시겠습니까?\n모든 데이터가 영구 삭제됩니다.')) alert('계정 탈퇴 요청이 접수되었습니다. 처리까지 최대 7일이 소요될 수 있습니다.'); }} className="px-4 py-2 bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                        회원 탈퇴
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ADMIN LIST view */}
          {activeMenu === 'adminlist' && (() => {
            const list: AnyMember[] = adminTab === 'corporate'
              ? orgList.filter(m =>
                  (adminStatusFilter === '전체' || m.status === adminStatusFilter) &&
                  (adminSearch === '' || m.orgName.includes(adminSearch) || m.representative.includes(adminSearch) || m.region.includes(adminSearch))
                )
              : indList.filter(m =>
                  (adminStatusFilter === '전체' || m.status === adminStatusFilter) &&
                  (adminSearch === '' || m.name.includes(adminSearch) || m.region.includes(adminSearch) || m.contact.includes(adminSearch))
                );

            const gridColsClass = adminTab === 'corporate'
              ? 'grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto_auto]'
              : 'grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto]';

            const openEdit = (member: AnyMember) => {
              setEditingMember(member);
              setEditStatus(member.status);
              setEditName(member.type === 'corporate' ? member.orgName : member.name);
              setEditRepresentative(member.type === 'corporate' ? member.representative : '');
              setEditContact(member.contact);
              setEditRegion(member.region);
              setEditError(null);
            };

            const saveEdit = () => {
              if (!editingMember) return;
              setEditSaving(true);
              setEditError(null);
              updateAdminMember(Number(editingMember.id), {
                name: editName,
                representative: editingMember.type === 'corporate' ? editRepresentative : undefined,
                contact: editContact,
                region: editRegion,
                status: statusToApi(editStatus),
              })
                .then(() => {
                  setEditingMember(null);
                  return loadAdminUsers();
                })
                .catch(() => setEditError('저장에 실패했습니다. 다시 시도해주세요.'))
                .finally(() => setEditSaving(false));
            };

            return (
              <div className="flex-1 p-6 overflow-y-auto space-y-5">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    관리 목록
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">서비스에 등록된 기관 및 개인을 조회·검색·수정합니다.</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex bg-[#071329] border border-slate-800 rounded-xl p-1 gap-1">
                    <button onClick={() => setAdminTab('corporate')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${adminTab === 'corporate' ? 'bg-[#0758D6] text-white' : 'text-slate-400 hover:text-white'}`}>
                      <Building2 className="w-3.5 h-3.5" /> 기관 ({orgList.length})
                    </button>
                    <button onClick={() => setAdminTab('individual')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${adminTab === 'individual' ? 'bg-[#0758D6] text-white' : 'text-slate-400 hover:text-white'}`}>
                      <User className="w-3.5 h-3.5" /> 개인 ({indList.length})
                    </button>
                  </div>
                  <div className="flex gap-2 flex-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder={adminTab === 'corporate' ? '기관명, 담당자, 지역…' : '이름, 연락처, 지역…'} className="w-full pl-8 pr-4 py-2 bg-[#071329] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none" />
                    </div>
                    <select value={adminStatusFilter} onChange={e => setAdminStatusFilter(e.target.value as any)} className="bg-[#071329] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer">
                      {(['전체', '활성', '비활성'] as const).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className={`grid ${gridColsClass} text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-2.5 border-b border-slate-800 bg-slate-900/30`}>
                    <span>{adminTab === 'corporate' ? '기관명' : '이름'}</span>
                    {adminTab === 'corporate' && <span>담당자</span>}
                    <span>연락처</span>
                    <span>지역</span><span>등록일</span>
                    <span className="text-center w-14">카메라</span>
                    <span className="text-center w-16">상태</span>
                    <span className="text-center w-14">편집</span>
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {adminLoading
                      ? <div className="py-16 text-center text-xs text-slate-500">불러오는 중...</div>
                      : adminError
                        ? <div className="py-16 text-center text-xs text-red-400">{adminError}</div>
                        : list.length === 0
                          ? <div className="py-16 text-center text-xs text-slate-500">검색 결과가 없습니다.</div>
                          : list.map(member => (
                        <div key={member.id} className={`grid ${gridColsClass} px-4 py-3 items-center hover:bg-slate-800/20 text-xs`}>
                          <span className="font-semibold text-white truncate pr-2">{member.type === 'corporate' ? member.orgName : member.name}</span>
                          {member.type === 'corporate' && <span className="text-slate-400 truncate pr-2">{member.representative}</span>}
                          <span className="text-slate-400 truncate pr-2">{member.contact}</span>
                          <span className="text-slate-400 truncate pr-2">{member.region}</span>
                          <span className="text-slate-500 font-mono">{member.registeredAt}</span>
                          <span className="text-center text-slate-300 font-mono w-14">{member.cameraCount}대</span>
                          <span className="w-16 flex justify-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[member.status]}`}>{member.status}</span>
                          </span>
                          <button onClick={() => openEdit(member)} className="w-14 flex justify-center text-slate-500 hover:text-blue-400 cursor-pointer" title="편집">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 text-right">총 {list.length}건</p>

                {editingMember && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-white">{editingMember.type === 'corporate' ? (editingMember as OrgMember).orgName : (editingMember as IndividualMember).name} 편집</h3>
                        <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400">{editingMember.type === 'corporate' ? '기관명' : '이름'}</label>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                        </div>
                        {editingMember.type === 'corporate' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400">담당자</label>
                            <input value={editRepresentative} onChange={e => setEditRepresentative(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400">연락처</label>
                          <input value={editContact} onChange={e => setEditContact(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400">지역</label>
                          <input value={editRegion} onChange={e => setEditRegion(e.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400">상태</label>
                          <div className="flex gap-2">
                            {(['활성', '비활성'] as MemberStatus[]).map(s => (
                              <button key={s} onClick={() => setEditStatus(s)} className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${editStatus === s ? STATUS_STYLE[s] : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>{s}</button>
                            ))}
                          </div>
                        </div>
                        {editError && <p className="text-[11px] text-red-400">{editError}</p>}
                        <button onClick={saveEdit} disabled={editSaving} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs cursor-pointer">{editSaving ? '저장 중...' : '저장'}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}


          {/* ===== CCTV REGISTRATION VIEW ===== */}
          {activeMenu === 'cctvReg' && (
            <CCTVRegistration
              onRegisterComplete={(count) => {
                logger.info(`Registered ${count} corporate cameras successfully.`);
              }}
              onCameraChanged={refetchSpaceCameras}
              defaultCompanyId={spaces.find(s => s.id === selectedSpaceId)?.type === 'corporate' ? Number(selectedSpaceId.split('-')[1]) : undefined}
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
                            {inq.userRole === 'INDIVIDUAL' ? '개인' : '기업'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          inq.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {inq.status === 'COMPLETED' ? <><Check className="w-2.5 h-2.5" />답변완료</> : '미답변'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{inq.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">{inq.userName}</span>
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
                            {selectedAdminQna.userRole === 'INDIVIDUAL' ? '개인 사용자' : '기업 사용자'} · {selectedAdminQna.userName}
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
                          {selectedAdminQna.status === 'COMPLETED' ? '등록된 답변' : '답변 작성'}
                        </span>
                        <span className="h-px flex-1 bg-slate-800" />
                      </div>

                      {selectedAdminQna.status === 'COMPLETED' ? (
                        <div className="bg-[#0f192b] border border-emerald-500/20 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                              <Shield className="w-3 h-3 text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-emerald-400">관리자 답변</span>
                            <span className="text-[10px] text-slate-500">{selectedAdminQna.repliedAt}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedAdminQna.replyContent}</p>
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


      </div>

      {/* ===== TEST MODE MODALS ===== */}
      {tShowAddCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">카메라 등록</h3>
              <button onClick={() => {setTShowAddCamera(false);setTShowNewCamPw(false);}} className="text-xs text-slate-400 hover:text-white cursor-pointer">닫기</button>
            </div>
            <div className="p-5 space-y-4">
              {[{label:'카메라 ID',v:tNewCamId,sv:setTNewCamId,ph:'예: CCTV-08'},{label:'카메라 이름',v:tNewCamName,sv:setTNewCamName,ph:'예: 후문 출입구'},{label:'설치 위치',v:tNewCamLocation,sv:setTNewCamLocation,ph:'예: 1층 후문'}].map(f => (
                <div key={f.label} className="space-y-1.5"><label className="text-xs font-semibold text-slate-400">{f.label}</label><input value={f.v} onChange={e=>f.sv(e.target.value)} placeholder={f.ph} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"/></div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><KeyRound className="w-3 h-3"/>카메라 비밀번호 <span className="text-slate-600 font-normal">(선택)</span></label>
                <div className="relative">
                  <input type={tShowNewCamPw?'text':'password'} value={tNewCamPassword} onChange={e=>setTNewCamPassword(e.target.value)} placeholder="카메라 접속 비밀번호" className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"/>
                  <button onClick={() => setTShowNewCamPw(p=>!p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">{tShowNewCamPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
              </div>
              <button onClick={handleTAddCamera} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer">등록 완료</button>
            </div>
          </div>
        </div>
      )}

      {tShowNewQnaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400"/>새 문의 작성</h3>
              <button onClick={() => setTShowNewQnaModal(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">닫기</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">카테고리</label>
                <div className="grid grid-cols-2 gap-2">
                  {INQUIRY_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setTQnaCategory(cat)} className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${tQnaCategory===cat?CATEGORY_ACTIVE_STYLES[cat]:'bg-[#020817] border-slate-800 text-slate-400 hover:border-slate-600'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-400">제목</label><input value={tQnaTitle} onChange={e=>setTQnaTitle(e.target.value)} placeholder="문의 제목을 입력해 주세요" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none"/></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-400">문의 내용</label><textarea value={tQnaContent} onChange={e=>setTQnaContent(e.target.value)} placeholder="문의하실 내용을 자세히 작성해 주세요" rows={5} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none resize-none"/></div>
              <button onClick={handleTSubmitQna} disabled={!tQnaTitle.trim()||!tQnaContent.trim()} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2"><Send className="w-3.5 h-3.5"/>문의 등록</button>
            </div>
          </div>
        </div>
      )}

      {tSelectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"/>
                <h3 className="text-sm font-extrabold text-white">이벤트 영상 재생기</h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">{tSelectedIncident.camera} — {tSelectedIncident.time}</span>
              </div>
              <button onClick={() => setTSelectedIncident(null)} className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-[#020817] border border-slate-800 cursor-pointer">닫기</button>
            </div>
            <div className="relative aspect-video bg-black overflow-hidden">
              <img src={liveCameras[0]?.streamUrl} alt="Playback" className="w-full h-full object-cover contrast-125 brightness-75"/>
              <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 border-2 border-rose-500 rounded bg-rose-500/5 flex flex-col justify-between p-2">
                <span className="text-[9px] font-bold text-white bg-rose-600 px-1.5 rounded uppercase self-start">{tSelectedIncident.type}</span>
                <span className="text-[10px] text-rose-400 font-extrabold text-center animate-pulse">이상 거동 감지 (CRITICAL)</span>
              </div>
            </div>
            <div className="bg-[#061224] p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>00:{tPlaybackProgress.toString().padStart(2,'0')}</span>
                  <span className="text-rose-400 font-bold">감지 타임스탬프 (00:30)</span>
                  <span>01:00</span>
                </div>
                <input type="range" min="0" max="60" value={tPlaybackProgress} onChange={e=>setTPlaybackProgress(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setTIsPlaying(p=>!p)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white cursor-pointer">{tIsPlaying?<Pause className="w-5 h-5"/>:<Play className="w-5 h-5"/>}</button>
                  <div className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-slate-400"/><input type="range" min="0" max="100" value={tPlaybackVolume} onChange={e=>setTPlaybackVolume(Number(e.target.value))} className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"/></div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={tPlaybackSpeed} onChange={e=>setTPlaybackSpeed(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 font-bold cursor-pointer">
                    <option value="0.5">0.5x</option><option value="1.0">1.0x</option><option value="1.5">1.5x</option><option value="2.0">2.0x</option>
                  </select>
                  <button onClick={() => alert('스냅샷 저장 완료')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 flex items-center gap-1 cursor-pointer"><Download className="w-3.5 h-3.5"/>스냅샷</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FLOATING STATS PANEL ===== */}
      {!isTestMode && (
        <div className="fixed bottom-4 left-4 z-50 w-56">
          <CCTVStatsCards
            activeFeedsCount={cameraStats?.connectedCount ?? 0}
            totalFeedsCount={cameraStats?.totalCount ?? 0}
            alertsCount={todayAlertCount}
            falsePositiveRatePercent={falsePositiveRate?.ratePercent ?? null}
            falsePositiveRateDeltaPercent={falsePositiveRate?.deltaPercent ?? null}
          />
        </div>
      )}
    </div>
  );
}
