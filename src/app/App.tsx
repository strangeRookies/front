import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { PersonalSignUp } from '../features/signup/pages/PersonalSignUp';
import { CorporateSignUp } from '../features/signup/pages/CorporateSignUp';
import { NurseDashboard } from '../features/dashboard/pages/UserDashboard';
import { IntegratedDashboard } from '../features/dashboard/pages/IntegratedDashboard';
import { clearAuthSession } from '../features/auth/api/authApi';

type ViewType = 'login' | 'personalSignUp' | 'corporateSignUp' | 'forgotPassword' | 'userDashboard' | 'adminDashboard';
type UserType = 'individual' | 'corporate';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sessionUser, setSessionUser] = useState('');
  const [userType, setUserType] = useState<UserType>('individual');

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

  const handleLogout = () => {
    clearAuthSession();
    setCurrentView('login');
    toast.info('안전 관제 세션이 종료되었습니다. 로그아웃 완료.');
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

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans selection:bg-blue-500/35 selection:text-white">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors theme="dark" />

      {/* State-Based Router Switch */}
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
  );
}
