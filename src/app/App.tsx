import React, { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { PersonalSignUp } from '../features/signup/pages/PersonalSignUp';
import { CorporateSignUp } from '../features/signup/pages/CorporateSignUp';
import { NurseDashboard } from '../features/dashboard/pages/UserDashboard';
import { IntegratedDashboard } from '../features/dashboard/pages/IntegratedDashboard';
import {
  clearAuthSession,
  logout,
  reissueToken,
  roleToFrontendAccountType,
  saveAuthSession,
} from '../features/auth/api/authApi';

//  추가: MonitoringDashboard 컴포넌트 임포트 
import MonitoringDashboard from '../components/dashboard/MonitoringDashboard';

//  추가: ViewType에 'monitoring' 상태 추가
type ViewType = 'login' | 'personalSignUp' | 'corporateSignUp' | 'forgotPassword' | 'userDashboard' | 'adminDashboard' | 'monitoring';
type UserType = 'individual' | 'corporate';

function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className="hidden sm:flex absolute top-0 left-0 right-0 h-14 z-[90] items-center justify-between px-6 pointer-events-none text-white font-semibold">
      <span className="w-12 text-center text-[14px] mt-1 tracking-tight">{hours}:{minutes}</span>
      <div className="flex gap-1.5 items-center mt-1">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <BatteryFull className="w-[18px] h-[18px]" />
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sessionUser, setSessionUser] = useState('');
  const [userType, setUserType] = useState<UserType>('individual');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const session = await reissueToken();
        if (cancelled) {
          return;
        }
        saveAuthSession(session);
        const role = roleToFrontendAccountType(session.user.role, 'individual');
        const displayName = session.user.name || session.user.email || '';
        setSessionUser(displayName);

        if (role === 'admin') {
          setCurrentView('adminDashboard');
        } else {
          setUserType(role);
          setCurrentView('userDashboard');
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setCurrentView('login');
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (role: 'individual' | 'corporate' | 'admin', username: string) => {
    setSessionUser(username);
    if (role === 'admin') {
      setCurrentView('adminDashboard');
      toast.success(`[관리자 로그인] ${username}님, 통합 관제 시스템에 접속했습니다.`);
    } else {
      setUserType(role);
      setCurrentView('userDashboard');
      toast.success(`[로그인 성공] ${username}님, 안전 관제 시스템에 접속했습니다.`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 로컬 세션은 항상 정리해 사용자가 로그아웃 상태로 돌아가게 합니다.
    } finally {
      clearAuthSession();
      setCurrentView('login');
      setSessionUser('');
      toast.info('안전 관제 세션이 종료되었습니다. 로그아웃 완료.');
    }
  };

  const handleNavigateToSignUp = (type: 'personal' | 'corporate') => {
    if (type === 'personal') {
      setCurrentView('personalSignUp');
    } else {
      setCurrentView('corporateSignUp');
    }
  };

  const handleSignUpComplete = () => {
    setCurrentView('login');
    toast.success('회원가입이 완료되었습니다. 가입한 계정으로 로그인해 주세요.');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentView('forgotPassword');
  };

  const handlePasswordResetComplete = () => {
    setCurrentView('login');
    toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans flex items-center justify-center">
        <div className="text-xs font-bold text-slate-400">세션 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#030712] sm:p-6 md:p-12 flex items-center justify-center">
      <div className="relative">
        {/* Subtle Hardware Buttons */}
        <div className="hidden sm:block absolute -left-[3px] top-[115px] h-8 w-[3px] rounded-l-md bg-slate-800 border-l border-slate-600/50 shadow-inner z-0" />
        <div className="hidden sm:block absolute -left-[3px] top-[175px] h-16 w-[3px] rounded-l-md bg-slate-800 border-l border-slate-600/50 shadow-inner z-0" />
        <div className="hidden sm:block absolute -left-[3px] top-[245px] h-16 w-[3px] rounded-l-md bg-slate-800 border-l border-slate-600/50 shadow-inner z-0" />
        <div className="hidden sm:block absolute -right-[3px] top-[190px] h-24 w-[3px] rounded-r-md bg-slate-800 border-r border-slate-600/50 shadow-inner z-0" />

        {/* Outer Metallic Frame */}
        <div 
          className="w-full h-[100dvh] sm:h-[844px] sm:max-h-[90vh] sm:w-[390px] relative sm:rounded-[3.5rem] bg-[#070e1b] sm:bg-gradient-to-br from-slate-500 via-slate-800 to-slate-900 sm:shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.4),inset_0_0_0_4px_#1e293b,-20px_20px_60px_rgba(0,0,0,0.9)] z-10"
          style={{ transform: 'translateZ(0)' }}
        >
          {/* Inner Black Glass Bezel */}
          <div className="absolute inset-0 sm:inset-[4px] bg-black sm:rounded-[3.3rem] shadow-[inset_0_0_0_1px_#333]">
            
            {/* The Actual Screen Area */}
            <div className="absolute inset-0 sm:inset-[10px] bg-[#070e1b] sm:rounded-[2.7rem] overflow-hidden flex flex-col shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              
              {/* Curved Screen Glare (Glass Effect) */}
              <div className="hidden sm:block pointer-events-none absolute inset-0 z-[200] bg-gradient-to-tr from-white/[0.04] via-transparent to-white/[0.01]"></div>

              {/* iOS Dynamic Island */}
              <div className="hidden sm:flex absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-black rounded-full z-[100] items-center justify-between px-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),inset_0_-2px_5px_rgba(255,255,255,0.1)]">
                <div className="w-3 h-3 rounded-full bg-[#0a0a0a] shadow-[inset_0_2px_2px_rgba(255,255,255,0.15)] border border-white/5" />
                <div className="w-3 h-3 rounded-full bg-[#0a0a0a] shadow-[inset_0_2px_2px_rgba(255,255,255,0.15)] border border-white/5" />
              </div>
              
              <StatusBar />
              
              {/* Main App Container */}
              <div className="h-full w-full bg-[#070e1b] text-slate-100 font-sans selection:bg-blue-500/35 selection:text-white relative overflow-hidden flex flex-col sm:pt-12">
          <Toaster position="top-right" richColors theme="dark" />



      {currentView === 'login' && (
        <LoginPage
          onLogin={handleLogin}
          onNavigateToSignUp={handleNavigateToSignUp}
          onNavigateToForgotPassword={handleNavigateToForgotPassword}
        />
      )}

      {currentView === 'personalSignUp' && (
        <PersonalSignUp
          onBackToLogin={handleBackToLogin}
          onSignUpComplete={handleSignUpComplete}
        />
      )}

      {currentView === 'corporateSignUp' && (
        <CorporateSignUp
          onBackToLogin={handleBackToLogin}
          onSignUpComplete={handleSignUpComplete}
        />
      )}

      {currentView === 'forgotPassword' && (
        <ForgotPasswordPage
          onBackToLogin={handleBackToLogin}
          onResetComplete={handlePasswordResetComplete}
        />
      )}

      {currentView === 'userDashboard' && (
        <NurseDashboard
          username={sessionUser}
          userType={userType}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'adminDashboard' && (
        <IntegratedDashboard
          onLogout={handleLogout}
        />
      )}


              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}