import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, LogOut, Shield, ShieldAlert, Loader2 } from 'lucide-react';
import type { Inquiry } from '../../../shared/types/inquiry';
import { fetchMyInquiries, createInquiry } from '../api/inquiryApi';
import { useAiAlertActions } from '../../../hooks/useAiAlertActions';
import { useDashboardAlerts } from '../hooks/useDashboardAlerts';
import type { MenuId, InquiryCategory, IncidentAlert } from '../types/dashboard';
import { STREAM_MODE, cameraLoginIdFor, getDynamicStreamUrl, streamRenderKind, type LiveCamera, type CameraConnectionStatus, type CameraEventStatus } from '../data/cameras';
import {
  ALL_MENU_ITEMS,
  CATEGORIES,
} from '../utils/dashboardStatus';
import {
  registerCamera,
  fetchCamerasByFacility,
  updateCamera,
  deleteCamera,
  type CameraResponse
} from '../../../app/api/cameraApi';
import {
  fetchMyFacilities,
  type FacilityResponse
} from '../../../app/api/facilityApi';
import { authStore } from '../../../shared/api/authStore';
import { DashboardAlertsView } from '../components/DashboardAlertsView';
import { DashboardCameraManagementView } from '../components/DashboardCameraManagementView';
import { DashboardHistoryView } from '../components/DashboardHistoryView';
import { DashboardHomeView } from '../components/DashboardHomeView';
import { DashboardMyPageView } from '../components/DashboardMyPageView';
import { DashboardQnaView } from '../components/DashboardQnaView';
import { AddCameraModal } from '../modals/AddCameraModal';
import { IncidentPlaybackModal } from '../modals/IncidentPlaybackModal';
import { NewInquiryModal } from '../modals/NewInquiryModal';
import { useCameraStatusWebSocket } from '../hooks/useCameraStatusWebSocket';


interface NurseDashboardProps {
  username: string;
  userType: 'individual' | 'corporate';
  onLogout: () => void;
}

function toLiveCameraConnectionStatus(camera: CameraResponse): CameraConnectionStatus {
  if (camera.status !== 'ACTIVE') return 'offline';

  switch (camera.connectionStatus) {
    case 'CONNECTED':
      return 'online';
    case 'RECONNECTING':
    case 'UNKNOWN':
      return 'connecting';
    case 'DISCONNECTED':
    case 'ERROR':
    case 'DISABLED':
      return 'offline';
    default:
      return 'connecting';
  }
}

function isVisibleLiveCamera(camera: CameraResponse) {
  return camera.status === 'ACTIVE'
    && camera.connectionStatus !== 'DISCONNECTED'
    && camera.connectionStatus !== 'ERROR'
    && camera.connectionStatus !== 'DISABLED';
}

function toLiveCameraStreamUrl(camera: CameraResponse) {
  const cameraLoginId = cameraLoginIdFor(camera.cameraLoginId, camera.cameraId);
  const url = getDynamicStreamUrl(cameraLoginId);
  console.log(`[CCTV Stream URL] mode=${STREAM_MODE}, cameraLoginId=${cameraLoginId}, cameraId=${camera.cameraId} -> ${url}`);
  return url;
}

export function NurseDashboard({
  username,
  userType,
  onLogout,
}: NurseDashboardProps) {
  // --- Data States ---
  const [facilities, setFacilities] = useState<FacilityResponse[]>([]);
  const [currentFacility, setCurrentFacility] = useState<FacilityResponse | null>(null);
  const [registeredCameras, setRegisteredCameras] = useState<CameraResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  // --- UI States ---
  const [activeMenu, setActiveMenu] = useState<MenuId>('home');
  const [searchDate, setSearchDate] = useState<'today' | 'week' | 'month'>('month');
  const [searchCamera, setSearchCamera] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentAlert | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(30);

  // --- Camera Management Form States ---
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamSerialNumber, setNewCamSerialNumber] = useState('');
  const [newCamLoginId, setNewCamLoginId] = useState('');
  const [newCamRtspUrl, setNewCamRtspUrl] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamPassword, setNewCamPassword] = useState('');
  const [newCamSourceType, setNewCamSourceType] = useState<'REAL_RTSP' | 'SIMULATED_RTSP'>('REAL_RTSP');
  const [showNewCamPw, setShowNewCamPw] = useState(false);
  const [showCamPwId, setShowCamPwId] = useState<string | null>(null);

  // --- QnA States ---
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedQnaId, setSelectedQnaId] = useState<number | null>(null);
  const [showNewQnaModal, setShowNewQnaModal] = useState(false);
  const [qnaTitle, setQnaTitle] = useState('');
  const [qnaContent, setQnaContent] = useState('');
  const [qnaCategory, setQnaCategory] = useState<InquiryCategory>(CATEGORIES[3]);

  // --- Derived Live Cameras for Monitoring (using backend data) ---
  const liveCameras = useMemo<LiveCamera[]>(() => {
    return registeredCameras
      .filter(isVisibleLiveCamera)
      .map((camera) => ({
        id: cameraLoginIdFor(camera.cameraLoginId, camera.cameraId),
        cameraLoginId: cameraLoginIdFor(camera.cameraLoginId, camera.cameraId),
        cameraDbId: camera.cameraId.toString(),
        name: camera.cameraName || camera.cameraLoginId,
        location: camera.locationDescription || camera.cameraLoginId || '-',
        streamUrl: toLiveCameraStreamUrl(camera),
        streamMode: STREAM_MODE,
        streamKind: streamRenderKind(),
        connectionStatus: toLiveCameraConnectionStatus(camera),
        eventStatus: 'normal',
      }));
  }, [registeredCameras]);

  // --- Real-time Camera Status from MQTT ---
  const cameraStatusMap = useCameraStatusWebSocket();

  // --- Connection Statistics for Sidebar ---
  const connectionStats = useMemo(() => {
    const activeCameras = registeredCameras.filter(cam => cam.status === 'ACTIVE');
    const connectedCount = activeCameras.filter(cam => {
      const realtime = cameraStatusMap.get(cam.cameraLoginId || '') || cameraStatusMap.get(cam.cameraId.toString());
      const currentStatus = realtime ? realtime.status : cam.connectionStatus;
      return currentStatus === 'CONNECTED';
    }).length;

    return {
      connected: connectedCount,
      total: activeCameras.length
    };
  }, [registeredCameras, cameraStatusMap]);

  // --- Facility Fetch Logic (Automatic) ---
  const loadInitialData = useCallback(async () => {
    if (userType === 'individual') {
      setFacilities([]);
      setCurrentFacility(null);
      setRegisteredCameras([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userFacilities = await fetchMyFacilities();
      setFacilities(userFacilities);
      if (userFacilities.length > 0) {
        setCurrentFacility(userFacilities[0]);
      }
    } catch (error) {
      console.error('Failed to load facilities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userType]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // --- Camera Fetch Logic ---
  const refreshCameras = useCallback(async () => {
    if (userType === 'corporate' && !currentFacility) return;
    try {
      setIsLoadingCameras(true);
      const facilityId = userType === 'individual' ? undefined : currentFacility?.facilityId;
      const data = await fetchCamerasByFacility(facilityId);
      setRegisteredCameras(data);
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    } finally {
      setIsLoadingCameras(false);
    }
  }, [currentFacility, userType]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  useEffect(() => {
    fetchMyInquiries()
      .then(setInquiries)
      .catch((err: unknown) => console.error('[QnA] fetch failed:', err));
  }, []);

  // --- AI and Alerts Hooks ---
  const focusHome = useCallback(() => setActiveMenu('home'), []);
  const {
    acknowledgedAiEventIds,
    dangerAiEvents,
    focusedLiveCameras,
    focusAiEventCamera,
    handleConfirmAiEvent,
    setFocusedCameraId,
    connectionState,
  } = useAiAlertActions({ userType, username, liveCameras, focusHome });

  const {
    alerts,
    activeTenMinAlerts,
    getFilteredHistory,
    resolveAlert,
  } = useDashboardAlerts({
    acknowledgedAiEventIds,
    dangerAiEvents,
    liveCameras,
    onConfirmAiEvent: handleConfirmAiEvent,
  });

  const filteredHistory = useMemo(
    () => getFilteredHistory({ searchDate, searchCamera, searchKeyword }),
    [getFilteredHistory, searchCamera, searchDate, searchKeyword],
  );

  // --- Handlers ---
  const handleOpenIncident = (alert: IncidentAlert) => {
    setSelectedIncident(alert);
  };

  const handleCameraClick = (camera: LiveCamera) => {
    setFocusedCameraId(camera.id);
    const matchingAlert = alerts.find((alert) => alert.camera === camera.location || alert.camera === camera.name);
    if (matchingAlert) setSelectedIncident(matchingAlert);
  };

  const handleTriggerEmergency = () => {
    const ok = window.confirm(`[${currentFacility?.facilityName || '시설'}] 119 긴급 출동 요청을 전송할까요?`);
    if (ok) alert('긴급 출동 요청을 전송했습니다.');
  };

  const handleAddCamera = async () => {
    if (userType === 'corporate' && !currentFacility) {
      alert('연결된 시설 정보가 없습니다.');
      return;
    }
    if (!newCamName.trim()) {
      alert('카메라 이름을 입력해주세요.');
      return;
    }
    if (!newCamSerialNumber.trim()) {
      alert('시리얼 넘버를 입력해주세요.');
      return;
    }
    if (!newCamPassword.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const facilityId = userType === 'individual' ? undefined : currentFacility?.facilityId;
      await registerCamera(facilityId, {
        cameraName: newCamName.trim(),
        cameraSerialNumber: newCamSerialNumber.trim(),
        cameraLoginId: newCamLoginId.trim() || undefined,
        cameraPassword: newCamPassword.trim(),
        rtspUrl: newCamSourceType === 'SIMULATED_RTSP' ? undefined : newCamRtspUrl.trim() || undefined,
        locationDescription: newCamLocation.trim() || '미지정',
        sourceType: newCamSourceType,
      });
      setNewCamName('');
      setNewCamSerialNumber('');
      setNewCamLoginId('');
      setNewCamRtspUrl('');
      setNewCamLocation('');
      setNewCamPassword('');
      setNewCamSourceType('REAL_RTSP');
      setShowNewCamPw(false);
      setShowAddCamera(false);
      refreshCameras();
    } catch (error: any) {
      alert(`카메라 등록에 실패했습니다: ${error.message || error}`);
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (!window.confirm('정말로 이 카메라를 삭제하시겠습니까?')) return;
    try {
      await deleteCamera(cameraId);
      refreshCameras();
    } catch (error) {
      alert('카메라 삭제에 실패했습니다.');
    }
  };

  const handleSubmitQna = async () => {
    if (!qnaTitle.trim() || !qnaContent.trim()) return;
    try {
      await createInquiry(qnaCategory, qnaTitle.trim(), qnaContent.trim());
      const updated = await fetchMyInquiries();
      setInquiries(updated);
    } catch (err) {
      console.error('[QnA] create failed:', err);
    }
    setQnaTitle('');
    setQnaContent('');
    setQnaCategory(CATEGORIES[3]);
    setShowNewQnaModal(false);
  };

  // --- Mapped Cameras for Selection/Management ---
  const mappedCamerasForMgmt = useMemo(() => {
    return registeredCameras.map(cam => ({
      id: cam.cameraId.toString(),
      name: cam.cameraName,
      location: cam.locationDescription,
      status: cam.status,
      rtspUrl: cam.rtspUrl,
      sourceType: cam.sourceType,
      assignedVideoPath: cam.assignedVideoPath,
      password: '****'
    }));
  }, [registeredCameras]);

  const selectedCameraObj = selectedIncident
    ? liveCameras.find((camera) => camera.name === selectedIncident.camera || camera.location === selectedIncident.camera)
    : null;

  const playbackStreamUrl = selectedCameraObj?.streamUrl || liveCameras[0]?.streamUrl;
  const playbackStreamKind = selectedCameraObj?.streamKind || liveCameras[0]?.streamKind;

  // --- Loading View ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm text-slate-400 font-bold tracking-widest uppercase">Connecting to Safety Session...</p>
      </div>
    );
  }

  // --- Main Layout Render ---
  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col font-sans">
      <header className="h-14 bg-[#061224] border-b border-slate-800/60 px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400 fill-blue-400/20" />
          <h1 className="text-sm font-extrabold tracking-wider text-white">스마트 안전 관제 시스템</h1>
          <span className="h-4 w-px bg-slate-700" />
          <span className="text-xs font-bold text-slate-400">
            {userType === 'individual' ? '개인용 대시보드' : '기업용 대시보드'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-bold text-rose-400">확인 대기 이벤트 {activeTenMinAlerts.length}건</span>
          </div>
          <div
            className="flex items-center gap-2 ml-2 px-2 py-0.5 rounded text-[10px] font-bold"
            style={{
              color: connectionState === 'connected' ? '#34d399' : connectionState === 'connecting' ? '#fbbf24' : '#94a3b8',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connectionState === 'connected' ? '#34d399' : connectionState === 'connecting' ? '#fbbf24' : '#64748b',
              }}
            />
            {connectionState === 'connected' ? '연결됨' : connectionState === 'connecting' ? '연결 중' : '연결 끊김'}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200 block">{username || '사용자'}</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {userType === 'individual' ? '개인' : '기업'}
              </span>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 bg-[#071329] border-r border-slate-800/50 flex flex-col flex-shrink-0">
          <div className="p-4 space-y-1 flex-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">메뉴</h3>
            <nav className="space-y-0.5">
              {ALL_MENU_ITEMS.filter((item) => !item.individualOnly || userType === 'individual').map(({ id, label, icon: Icon }) => {
                const isActive = activeMenu === id;
                const badge = id === 'alerts' ? activeTenMinAlerts.length : undefined;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setFocusedCameraId(null);
                      setActiveMenu(id);
                    }}
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

            <div className="mt-8 pt-6 border-t border-slate-800/50 space-y-4 px-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">상태</h3>
              <div className="bg-[#0f172a] rounded-xl p-3 border border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">카메라 연결</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex items-end gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400 mb-0.5" />
                  <span className="text-sm font-extrabold text-white">
                    {connectionStats.connected}/{connectionStats.total}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mb-0.5">대</span>
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-xl p-3 border border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">확인 대기 이벤트</span>
                  {activeTenMinAlerts.length > 0 && (
                    <span className="text-[8px] font-bold bg-rose-500 text-white px-1 rounded-sm animate-bounce">NEW</span>
                  )}
                </div>
                <div className="flex items-end gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 mb-0.5" />
                  <span className="text-sm font-extrabold text-white">{activeTenMinAlerts.length}</span>
                  <span className="text-[9px] text-slate-500 font-bold mb-0.5">건</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden">
          {activeMenu === 'home' && (
            <DashboardHomeView
              acknowledgedAiEventIds={acknowledgedAiEventIds}
              dangerAiEvents={dangerAiEvents}
              focusedLiveCameras={focusedLiveCameras}
              onCameraSelect={handleCameraClick}
              onConfirmAiEvent={handleConfirmAiEvent}
              onEmergency={handleTriggerEmergency}
              onFocusAiEvent={focusAiEventCamera}
              cameraStatusMap={cameraStatusMap}
            />
          )}
          {activeMenu === 'alerts' && (
            <DashboardAlertsView
              alerts={activeTenMinAlerts}
              onOpenIncident={handleOpenIncident}
              onResolveAlert={resolveAlert}
            />
          )}
          {activeMenu === 'history' && (
            <DashboardHistoryView
              filteredHistory={filteredHistory}
              searchCamera={searchCamera}
              searchDate={searchDate}
              searchKeyword={searchKeyword}
              cameraOptions={mappedCamerasForMgmt}
              onOpenIncident={handleOpenIncident}
              onSearchCameraChange={setSearchCamera}
              onSearchDateChange={setSearchDate}
              onSearchKeywordChange={setSearchKeyword}
            />
          )}
          {activeMenu === 'cameras' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {isLoadingCameras && registeredCameras.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-xs text-slate-500 font-bold">카메라 목록을 불러오는 중...</p>
                </div>
              ) : (
                <DashboardCameraManagementView
                  liveCameras={liveCameras}
                  registeredCameras={mappedCamerasForMgmt}
                  showCamPwId={showCamPwId}
                  facilityName={currentFacility?.facilityName}
                  facilityId={currentFacility?.facilityId}
                  onAddCamera={() => setShowAddCamera(true)}
                  onDeleteCamera={handleDeleteCamera}
                  onTogglePassword={(cameraId) => setShowCamPwId((prev) => (prev === cameraId ? null : cameraId))}
                />
              )}
            </div>
          )}
          {activeMenu === 'mypage' && (
            <DashboardMyPageView
              userType={userType}
              username={username}
              onLogout={onLogout}
            />
          )}
          {activeMenu === 'qna' && (
            <DashboardQnaView
              inquiries={inquiries}
              selectedQnaId={selectedQnaId}
              onBack={() => setSelectedQnaId(null)}
              onCreateInquiry={() => setShowNewQnaModal(true)}
              onSelectQna={setSelectedQnaId}
            />
          )}
        </main>
      </div>

      {showAddCamera && (
        <AddCameraModal
          newCamId={newCamLoginId}
          newCamLocation={newCamLocation}
          newCamName={newCamName}
          newCamSerialNumber={newCamSerialNumber}
          newCamPassword={newCamPassword}
          newCamRtspUrl={newCamRtspUrl}
          newCamSourceType={newCamSourceType}
          showNewCamPw={showNewCamPw}
          onClose={() => {
            setShowAddCamera(false);
            setShowNewCamPw(false);
          }}
          onIdChange={setNewCamLoginId}
          onLocationChange={setNewCamLocation}
          onNameChange={setNewCamName}
          onSerialNumberChange={setNewCamSerialNumber}
          onPasswordChange={setNewCamPassword}
          onRtspUrlChange={setNewCamRtspUrl}
          onSourceTypeChange={setNewCamSourceType}
          onSubmit={handleAddCamera}
          onTogglePassword={() => setShowNewCamPw((prev) => !prev)}
        />
      )}

      {showNewQnaModal && (
        <NewInquiryModal
          qnaCategory={qnaCategory}
          qnaContent={qnaContent}
          qnaTitle={qnaTitle}
          onCategoryChange={setQnaCategory}
          onClose={() => setShowNewQnaModal(false)}
          onContentChange={setQnaContent}
          onSubmit={handleSubmitQna}
          onTitleChange={setQnaTitle}
        />
      )}

      {selectedIncident && (
        <IncidentPlaybackModal
          incident={selectedIncident}
          isPlaying={isPlaying}
          playbackProgress={playbackProgress}
          playbackStreamUrl={playbackStreamUrl}
          playbackStreamKind={playbackStreamKind}
          onClose={() => setSelectedIncident(null)}
          onPlaybackProgressChange={setPlaybackProgress}
          onTogglePlaying={() => setIsPlaying((prev) => !prev)}
        />
      )}
    </div>
  );
}
