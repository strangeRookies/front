import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { PersonalSignUp } from '../features/signup/pages/PersonalSignUp';
import { CorporateSignUp } from '../features/signup/pages/CorporateSignUp';
import { NurseDashboard } from '../features/dashboard/pages/UserDashboard';
import { IntegratedDashboard } from '../features/dashboard/pages/IntegratedDashboard';
import { PushAlertEventDetailDialog } from '../features/dashboard/modals/PushAlertEventDetailDialog';
import {
  clearAuthSession,
  logout,
  reissueToken,
  roleToFrontendAccountType,
  saveAuthSession,
} from '../features/auth/api/authApi';
import { releasePushDeviceBeforeLogout } from '../shared/push/pushNotificationService';
import { usePushNotifications } from '../shared/push/usePushNotifications';

type ViewType = 'login' | 'personalSignUp' | 'corporateSignUp' | 'forgotPassword' | 'userDashboard' | 'adminDashboard';
type UserType = 'individual' | 'corporate';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sessionUser, setSessionUser] = useState('');
  const [userType, setUserType] = useState<UserType>('individual');
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [pushAlertEventId, setPushAlertEventId] = useState<number | null>(null);
  const isAuthenticatedView = currentView === 'userDashboard' || currentView === 'adminDashboard';

  usePushNotifications(!isRestoringSession && isAuthenticatedView, {
    onAction: ({ data }) => {
      if (data.type === 'FCM_TEST') {
        toast.success('FCM 테스트 알림 연결이 정상입니다.');
        return;
      }

      const eventId = Number(data.eventId);
      if (data.type === 'AI_DANGER_EVENT' && Number.isSafeInteger(eventId) && eventId > 0) {
        setPushAlertEventId(eventId);
        return;
      }

      toast.error('알림의 이벤트 정보를 확인할 수 없습니다.');
    },
  });

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
      await releasePushDeviceBeforeLogout();
    } catch {
      // Device unlinking is best-effort and must not prevent logout.
    }

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
        <IntegratedDashboard onLogout={handleLogout} />
      )}

      <PushAlertEventDetailDialog
        eventId={pushAlertEventId}
        onClose={() => setPushAlertEventId(null)}
      />
    </div>
  );
}
