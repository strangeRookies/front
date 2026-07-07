import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  User, 
  Lock, 
  Eye, 
  EyeOff,
  Building
} from 'lucide-react';
import {
  AUTH_STORAGE_KEYS,
  login,
  roleToFrontendAccountType,
  saveAuthSession,
} from '../api/authApi';
import { ApiError } from '../../../shared/api/client';

interface LoginPageProps {
  onLogin: (role: 'individual' | 'corporate' | 'admin', username: string) => void;
  onNavigateToSignUp: (type: 'personal' | 'corporate') => void;
  onNavigateToForgotPassword: () => void;
}

export function LoginPage({ onLogin, onNavigateToSignUp, onNavigateToForgotPassword }: LoginPageProps) {
  const [loginType, setLoginType] = useState<'individual' | 'corporate' | 'admin'>('individual');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(AUTH_STORAGE_KEYS.rememberedEmail);
    if (rememberedEmail) {
      setUsername(rememberedEmail);
      setRememberId(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('아이디를 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    try {
      setIsSubmitting(true);
      const loginResponse = await login(username.trim(), password, loginType);
      saveAuthSession(loginResponse);

      if (rememberId) {
        localStorage.setItem(AUTH_STORAGE_KEYS.rememberedEmail, username.trim());
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.rememberedEmail);
      }

      const role = roleToFrontendAccountType(loginResponse.user.role, loginType);
      const displayName = loginResponse.user.name || loginResponse.user.email || username.trim();
      onLogin(role, displayName);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'AUTH_ACCOUNT_SUSPENDED') {
        alert('비활성화된 계정입니다. 계정 정보를 확인하세요.');
      } else {
        alert('아이디 또는 비밀번호를 확인해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 h-full w-full bg-[#060a13] text-slate-100 flex flex-col font-sans overflow-y-auto">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#060a13] to-[#03050a] pointer-events-none" />

      {/* Main Content */}
      <div className="w-full flex-1 flex flex-col p-6 relative z-10 max-w-md mx-auto">
        
        {/* Header (Logo & Title) */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-white mb-1">
              스마트 안전 관제
            </h1>
            <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
              Safety Management
            </p>
          </div>
        </div>

        {/* Account Type selectors (Tabs) */}
        <div className="flex p-1 bg-slate-800/50 rounded-xl mb-6 backdrop-blur-sm">
          {[
            { id: 'individual', label: '개인용', icon: User },
            { id: 'corporate', label: '기업용', icon: Building },
          ].map((type) => {
            const Icon = type.icon;
            const isSelected = loginType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setLoginType(type.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[11px] font-bold">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="space-y-4">
            {/* ID Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 ml-1">아이디</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  className="w-full pl-11 pr-4 py-3.5 bg-[#0a1224] border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 ml-1">비밀번호</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-11 pr-12 py-3.5 bg-[#0a1224] border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remembers & Find */}
            <div className="flex items-center justify-between text-[11px] px-1 pt-2">
              <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0a1224] border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="font-medium">아이디 저장</span>
              </label>
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-slate-400 hover:text-blue-400 transition-colors font-bold"
              >
                비밀번호 찾기
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4 pb-2">
            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
            
            {/* Sign Up Link — admin에게는 숨김 */}
            {loginType !== 'admin' && (
              <div className="text-center mt-4">
                <span className="text-[11px] text-slate-500 font-medium">계정이 없으신가요? </span>
                <button
                  type="button"
                  onClick={() => onNavigateToSignUp(loginType === 'individual' ? 'personal' : 'corporate')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors ml-1 cursor-pointer"
                >
                  회원가입하기
                </button>
              </div>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
