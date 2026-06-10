import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { fetchUserProfile, updateUserProfile, updatePassword, withdrawAccount } from '../../../app/api/userDashboard';
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
  userType: 'individual' | 'corporate';
  username: string;
  onLogout: () => void;
}

export function DashboardMyPageView(props: DashboardMyPageViewProps) {
  const { userType, username, onLogout } = props;

  const [mypageTab, setMypageTab] = useState<MypageTab>('profile');
  const [profileName, setProfileName] = useState(username || '사용자');
  const [profileEmail, setProfileEmail] = useState(username?.includes('@') ? username : `${username || 'user'}@example.com`);
  const [profilePhone, setProfilePhone] = useState('010-1234-5678');
  const [profileCreatedAt, setProfileCreatedAt] = useState('2026-01-01');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [notifEvent, setNotifEvent] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [alertLevel, setAlertLevel] = useState<'all' | 'warning' | 'critical'>('warning');

  // Load profile from API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchUserProfile();
        if (profile.name) setProfileName(profile.name);
        if (profile.email) setProfileEmail(profile.email);
        if (profile.phoneNumber) setProfilePhone(profile.phoneNumber);
        if (profile.createdAt) {
          const dateOnly = profile.createdAt.split('T')[0];
          setProfileCreatedAt(dateOnly);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({
        name: profileName,
        email: profileEmail,
        phoneNumber: profilePhone.replace(/[^0-9]/g, ''),
      });
      toast.success('프로필 정보가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('프로필 정보를 저장하는데 실패했습니다.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw) {
      toast.error('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPw.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await updatePassword(currentPw, newPw);
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('비밀번호 변경에 실패했습니다. 현재 비밀번호를 다시 확인해 주세요.');
    }
  };

  const handleSaveNotifications = () => toast.success('알림 설정을 저장했습니다.');

  const handleWithdraw = async () => {
    if (!window.confirm('정말로 회원 탈퇴를 진행하시겠습니까? 모든 정보가 영구적으로 삭제되며 복구할 수 없습니다.')) {
      return;
    }

    try {
      await withdrawAccount();
      toast.success('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      setTimeout(() => {
        onLogout();
      }, 1500);
    } catch (error) {
      console.error('Failed to withdraw account:', error);
      toast.error('회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

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
            { id: 'password', label: '비밀번호 변경', icon: Lock },
            { id: 'account', label: '계정 관리', icon: Shield },
          ] as const).map(({ id, label, icon: Icon }) => (
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
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />이메일</label>
                <input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />연락처</label>
                <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
              </div>
              <div className="pt-1 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">계정 유형</label>
                  <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">{userType === 'individual' ? '개인 안전담당자' : '기업 안전담당자'}</div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">가입일</label>
                  <div className="px-3 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400">{profileCreatedAt}</div>
                </div>
              </div>
            </div>
            <button onClick={handleSaveProfile} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">저장</button>
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
                  <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={(event) => setCurrentPw(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={() => setShowCurrentPw((p) => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">새 비밀번호</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={(event) => setNewPw(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={() => setShowNewPw((p) => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
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
                  <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={(event) => setConfirmPw(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                  <button onClick={() => setShowConfirmPw((p) => !p)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
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
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                · 비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다.<br />
                · 변경 후 모든 기기에서 재로그인이 필요합니다.
              </p>
            </div>
            <button onClick={handleChangePassword} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">비밀번호 변경</button>
          </div>
        )}


        {mypageTab === 'account' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-white">계정 관리</h2>
              <p className="text-xs text-slate-400 mt-1">서비스를 탈퇴할 수 있습니다.</p>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-rose-500 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">회원 탈퇴</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    회원 탈퇴 시 서비스 이용 권한이 즉시 회수되며, 등록된 정보는 시스템 관리 방침에 따라 처리됩니다.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleWithdraw}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                서비스 탈퇴하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
