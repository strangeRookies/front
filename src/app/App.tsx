import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans selection:bg-blue-500/35 selection:text-white relative">
      <Toaster position="top-right" richColors theme="dark" />

      {/*  개발용 임시 버튼: 로그인 없이 CCTV 화면을 바로 띄워보기 위한 버튼임. 개발 완료 후 삭제 */}
      {currentView !== 'monitoring' && (
        <button
          onClick={() => setCurrentView('monitoring')}
          className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-full shadow-2xl font-bold transition-all transform hover:scale-105"
        >
          📷 CCTV 테스트 모드
        </button>
      )}

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

      {/* 추가: CCTV 모니터링 테스트용 뷰 렌더링 */}
      {currentView === 'monitoring' && (
        <div className="flex flex-col h-screen">
          <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-bold">CCTV 실시간 오버레이 테스트</h1>
            <button 
              onClick={() => setCurrentView('login')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium"
            >
              돌아가기
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MonitoringDashboard />
          </div>
        </div>
      )}
    </div>
  );
}