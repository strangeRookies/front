import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { PersonalSignUp } from './pages/PersonalSignUp';
import { CorporateSignUp } from './pages/CorporateSignUp';
import { NurseDashboard } from './pages/NurseDashboard';
import { IntegratedDashboard } from './pages/IntegratedDashboard';

type ViewType = 'login' | 'personalSignUp' | 'corporateSignUp' | 'nurseDashboard' | 'integratedDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sessionUser, setSessionUser] = useState('간호사 김민정');

  const handleLogin = (role: 'individual' | 'corporate', username: string) => {
    setSessionUser(username);
    if (role === 'individual') {
      setCurrentView('nurseDashboard');
      toast.success(`[로그인 성공] ${username} 간호사님, 환영합니다.`);
    } else {
      setCurrentView('integratedDashboard');
      toast.success(`[로그인 성공] 최고 권한 관제자 계정으로 접속했습니다.`);
    }
  };

  const handleLogout = () => {
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

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans selection:bg-blue-500/35 selection:text-white">
      {/* Toast Notification Container */}
      <Toaster position="top-right" richColors theme="dark" />

      {/* State-Based Router Switch */}
      {currentView === 'login' && (
        <LoginPage 
          onLogin={handleLogin}
          onNavigateToSignUp={handleNavigateToSignUp}
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

      {currentView === 'nurseDashboard' && (
        <NurseDashboard 
          username={sessionUser}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'integratedDashboard' && (
        <IntegratedDashboard 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}