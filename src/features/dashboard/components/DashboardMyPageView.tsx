import {
  Bell,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import { MOCK_LOGIN_HISTORY, getPasswordStrength } from '../utils/dashboardStatus';
import type { MypageTab } from '../types/dashboard';

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

interface DashboardMyPageViewProps {
  alertLevel: 'all' | 'warning' | 'critical';
  confirmPw: string;
  currentPw: string;
  newPw: string;
  notifEmail: boolean;
  notifEvent: boolean;
  notifSms: boolean;
  mypageTab: MypageTab;
  profileEmail: string;
  profileName: string;
  profilePhone: string;
  showConfirmPw: boolean;
  showCurrentPw: boolean;
  showNewPw: boolean;
  userType: 'individual' | 'corporate';
  username: string;
  onAlertLevelChange: (value: 'all' | 'warning' | 'critical') => void;
  onChangePassword: () => void;
  onConfirmPwChange: (value: string) => void;
  onCurrentPwChange: (value: string) => void;
  onMypageTabChange: (value: MypageTab) => void;
  onNotifEmailChange: (value: boolean) => void;
  onNotifEventChange: (value: boolean) => void;
  onNotifSmsChange: (value: boolean) => void;
  onNewPwChange: (value: string) => void;
  onProfileEmailChange: (value: string) => void;
  onProfileNameChange: (value: string) => void;
  onProfilePhoneChange: (value: string) => void;
  onSaveNotifications: () => void;
  onSaveProfile: () => void;
  onToggleConfirmPw: () => void;
  onToggleCurrentPw: () => void;
  onToggleNewPw: () => void;
}

export function DashboardMyPageView(props: DashboardMyPageViewProps) {
  const {
    alertLevel,
    confirmPw,
    currentPw,
    newPw,
    notifEmail,
    notifEvent,
    notifSms,
    mypageTab,
    profileEmail,
    profileName,
    profilePhone,
    showConfirmPw,
    showCurrentPw,
    showNewPw,
    userType,
    username,
    onAlertLevelChange,
    onChangePassword,
    onConfirmPwChange,
    onCurrentPwChange,
    onMypageTabChange,
    onNotifEmailChange,
    onNotifEventChange,
    onNotifSmsChange,
    onNewPwChange,
    onProfileEmailChange,
    onProfileNameChange,
    onProfilePhoneChange,
    onSaveNotifications,
    onSaveProfile,
    onToggleConfirmPw,
    onToggleCurrentPw,
    onToggleNewPw,
  } = props;

  const pwStrength = getPasswordStrength(newPw);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-52 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0 p-4">
        <div className="flex items-center gap-2 mb-5 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-extrabold text-blue-400">
            {(profileName || '사용자').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{profileName || username}</p>
            <p className="text-[10px] text-slate-500">{userType === 'individual' ? '개인용 대시보드' : '기업용 대시보드'}</p>
          </div>
        </div>
        <nav className="space-y-0.5">
          {([
            { id: 'profile', label: '프로필', icon: User },
            { id: 'password', label: '비밀번호', icon: Lock },
            { id: 'notifications', label: '알림 설정', icon: Bell },
            { id: 'account', label: '계정 보안', icon: Shield },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onMypageTabChange(id)}
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

      <div className="flex-1 overflow-y-auto p-8">
        {mypageTab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white">프로필</h2>
              <p className="text-xs text-slate-400 mt-1">계정 기본 정보를 수정합니다.</p>
            </div>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><User className="w-3 h-3" />이름</label>
                <input value={profileName} onChange={(event) => onProfileNameChange(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />이메일</label>
                <input value={profileEmail} onChange={(event) => onProfileEmailChange(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />연락처</label>
                <input value={profilePhone} onChange={(event) => onProfilePhoneChange(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
            </div>
            <button onClick={onSaveProfile} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">저장</button>
          </div>
        )}

        {mypageTab === 'password' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white">비밀번호</h2>
              <p className="text-xs text-slate-400 mt-1">로그인 비밀번호를 변경합니다.</p>
            </div>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">현재 비밀번호</label>
                <div className="relative">
                  <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={(event) => onCurrentPwChange(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={onToggleCurrentPw} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">새 비밀번호</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={(event) => onNewPwChange(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={onToggleNewPw} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((step) => (
                        <div key={step} className={`h-1 flex-1 rounded-full transition-colors ${pwStrength.level >= step ? pwStrength.color : 'bg-slate-800'}`} />
                      ))}
                    </div>
                    <p className={`text-[10px] font-semibold ${pwStrength.level === 1 ? 'text-red-400' : pwStrength.level === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      보안 강도: {pwStrength.label}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">새 비밀번호 확인</label>
                <div className="relative">
                  <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={(event) => onConfirmPwChange(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={onToggleConfirmPw} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-[10px] text-red-400 font-semibold">새 비밀번호가 서로 일치하지 않습니다.</p>
                )}
                {confirmPw && newPw === confirmPw && (
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> 새 비밀번호가 일치합니다.</p>
                )}
              </div>
            </div>
            <button onClick={onChangePassword} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">비밀번호 변경</button>
          </div>
        )}

        {mypageTab === 'notifications' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white">알림 설정</h2>
              <p className="text-xs text-slate-400 mt-1">이벤트 알림을 받을 채널을 선택합니다.</p>
            </div>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl divide-y divide-slate-800/80">
              {[
                { label: '이벤트 알림', desc: '이상 상황 이벤트를 즉시 알립니다.', icon: Bell, value: notifEvent, onChange: onNotifEventChange },
                { label: '이메일 알림', desc: '이벤트 요약을 이메일로 전송합니다.', icon: Mail, value: notifEmail, onChange: onNotifEmailChange },
                { label: 'SMS 알림', desc: '긴급 이벤트를 문자로 전송합니다.', icon: Smartphone, value: notifSms, onChange: onNotifSmsChange },
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
              <p className="text-xs font-bold text-white">알림 기준</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'all', label: '전체', desc: '정보 포함' },
                  { id: 'warning', label: '주의 이상', desc: '주의 이상' },
                  { id: 'critical', label: '긴급', desc: '긴급만' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onAlertLevelChange(option.id as 'all' | 'warning' | 'critical')}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      alertLevel === option.id
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-[#020817] border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <p>{option.label}</p>
                    <p className="text-[9px] font-normal mt-0.5 opacity-60">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onSaveNotifications} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">저장</button>
          </div>
        )}

        {mypageTab === 'account' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white">계정 보안</h2>
              <p className="text-xs text-slate-400 mt-1">로그인 및 기기 상태를 확인합니다.</p>
            </div>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-white">최근 로그인 기록</h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {MOCK_LOGIN_HISTORY.map((log) => (
                  <div key={`${log.date}-${log.ip}`} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">{log.device}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono">{log.date}</span>
                        <span>/</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
