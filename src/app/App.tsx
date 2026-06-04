import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { PersonalSignUp } from '../features/signup/pages/PersonalSignUp';
import { CorporateSignUp } from '../features/signup/pages/CorporateSignUp';
import { NurseDashboard } from '../features/dashboard/pages/UserDashboard';
import { IntegratedDashboard } from '../features/dashboard/pages/IntegratedDashboard';
import type { Inquiry } from '../shared/types/inquiry';

type ViewType = 'login' | 'personalSignUp' | 'corporateSignUp' | 'forgotPassword' | 'userDashboard' | 'adminDashboard';
type UserType = 'individual' | 'corporate';

const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: 'inq-s1',
    userId: '홍길동',
    username: '홍길동',
    userType: 'individual',
    category: '카메라 및 영상',
    title: '복도 A 카메라 화질 저하 문의',
    content: '복도 A 카메라의 화질이 어제부터 갑자기 흐릿해졌습니다. 설정을 확인해도 변경된 것이 없는데 원인을 알 수 있을까요?',
    createdAt: '2026-05-28 14:32',
    reply: {
      content: '안녕하세요. 확인 결과 해당 카메라의 렌즈 초점이 틀어진 것으로 확인되었습니다. 담당 엔지니어가 초점 조정을 완료했으니 확인 부탁드립니다.',
      repliedAt: '2026-05-28 16:45',
    },
  },
  {
    id: 'inq-s2',
    userId: '김영희',
    username: '김영희',
    userType: 'corporate',
    category: '알림 및 경보',
    title: '이벤트 알림이 중복으로 수신됩니다',
    content: '같은 이벤트에 대해 알림이 2~3번씩 중복으로 오고 있습니다. 확인 후 조치 부탁드립니다.',
    createdAt: '2026-05-29 09:15',
  },
  {
    id: 'inq-s3',
    userId: '이철수',
    username: '이철수',
    userType: 'corporate',
    category: '기타',
    title: '사용자 권한 추가 요청',
    content: '신규 입사한 안전담당자에게 모니터링 권한을 추가해 주실 수 있나요? 담당자 이름은 박민준이고 이메일은 minjun@example.com 입니다.',
    createdAt: '2026-05-29 11:30',
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sessionUser, setSessionUser] = useState('');
  const [userType, setUserType] = useState<UserType>('individual');
  const [inquiries, setInquiries] = useState<Inquiry[]>(INITIAL_INQUIRIES);

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

  const handleAddInquiry = (data: Omit<Inquiry, 'id' | 'createdAt'>) => {
    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newInquiry: Inquiry = { ...data, id: `inq-${Date.now()}`, createdAt };
    setInquiries(prev => [newInquiry, ...prev]);
  };

  const handleAddReply = (inquiryId: string, replyContent: string) => {
    const now = new Date();
    const repliedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setInquiries(prev => prev.map(inq =>
      inq.id === inquiryId ? { ...inq, reply: { content: replyContent, repliedAt } } : inq
    ));
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
          inquiries={inquiries}
          onAddInquiry={handleAddInquiry}
        />
      )}

      {currentView === 'adminDashboard' && (
        <IntegratedDashboard
          onLogout={handleLogout}
          inquiries={inquiries}
          onAddReply={handleAddReply}
        />
      )}
    </div>
  );
}
