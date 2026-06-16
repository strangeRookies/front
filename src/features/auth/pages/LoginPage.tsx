import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Monitor, 
  Users, 
  User, 
  Lock, 
  Eye, 
  EyeOff,
  Building,
  Bell
} from 'lucide-react';
import {
  AUTH_STORAGE_KEYS,
  login,
  roleToFrontendAccountType,
  saveAuthSession,
} from '../api/authApi';

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
    } catch {
      alert('아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans overflow-y-auto p-4 sm:p-6 lg:p-8">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#060a13] to-[#03050a] pointer-events-none" />

      {/* Outer Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
        
        {/* ================= LEFT SECTION: Showroom & Info ================= */}
        <div className="lg:col-span-6 flex flex-col justify-between py-4 space-y-8 lg:space-y-0">
          {/* Logo & Main Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider text-white flex items-center gap-1.5">
                  스마트 안전 관제 시스템
                </h1>
                <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                  Smart Safety Management System
                </p>
              </div>
            </div>
          </div>

          {/* AI safety analysis illustration */}
          <div className="relative w-full aspect-[4/3] rounded-2xl border border-slate-800/80 bg-[#0a1122]/60 overflow-hidden flex items-center justify-center shadow-2xl p-4">
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-15" />
            
            <svg className="w-full h-full max-h-[300px] drop-shadow-[0_10px_20px_rgba(30,58,138,0.2)]" viewBox="0 0 400 300" fill="none">
              <defs>
                <radialGradient id="alert-radar" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(204 154) rotate(90) scale(78)">
                  <stop stopColor="#ef4444" stopOpacity="0.32" />
                  <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="scan-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#38bdf8" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="camera-cone" x1="65" y1="50" x2="210" y2="156" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* CCTV analysis frame */}
              <rect x="56" y="38" width="288" height="218" rx="18" fill="#07101f" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.9" />
              <rect x="76" y="58" width="248" height="178" rx="10" fill="#081426" stroke="#1e293b" strokeWidth="1" />
              <path d="M76 112H324M76 170H324M138 58V236M200 58V236M262 58V236" stroke="#1e293b" strokeWidth="0.8" opacity="0.45" />

              {/* Camera coverage and safe zone nodes */}
              <path d="M87 70L204 154L126 218Z" fill="url(#camera-cone)" />
              <circle cx="87" cy="70" r="5" fill="#3b82f6" className="animate-pulse" />
              <path d="M87 70h18l8 8" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
              <circle cx="296" cy="88" r="4" fill="#10b981" className="animate-pulse" />
              <circle cx="296" cy="88" r="13" stroke="#10b981" strokeWidth="1" opacity="0.25" />
              <circle cx="112" cy="214" r="4" fill="#10b981" />
              <circle cx="112" cy="214" r="12" stroke="#10b981" strokeWidth="1" opacity="0.2" />

              {/* AI fall detection target */}
              <circle cx="204" cy="154" r="78" fill="url(#alert-radar)" className="animate-pulse" />
              <circle cx="204" cy="154" r="46" fill="#ef4444" opacity="0.12" className="animate-ping" style={{ transformOrigin: '204px 154px', animationDuration: '2.4s' }} />
              <rect x="134" y="94" width="150" height="112" rx="8" stroke="#fb7185" strokeWidth="2" strokeDasharray="7 5" fill="#ef4444" opacity="0.04" />
              <path d="M134 113V94h22M262 94h22v19M284 187v19h-22M156 206h-22v-19" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" />

              {/* Pose/keypoint skeleton in alert posture */}
              <g strokeLinecap="round" strokeLinejoin="round">
                <circle cx="178" cy="138" r="10" fill="#e2e8f0" stroke="#f8fafc" strokeWidth="2" />
                <path d="M188 145L224 162" stroke="#e2e8f0" strokeWidth="6" />
                <path d="M205 153L181 174M206 153L232 136" stroke="#38bdf8" strokeWidth="4" />
                <path d="M224 162L250 181M223 162L207 196" stroke="#38bdf8" strokeWidth="4" />
                <circle cx="205" cy="153" r="4" fill="#38bdf8" />
                <circle cx="181" cy="174" r="4" fill="#38bdf8" />
                <circle cx="232" cy="136" r="4" fill="#38bdf8" />
                <circle cx="250" cy="181" r="4" fill="#fb7185" />
                <circle cx="207" cy="196" r="4" fill="#fb7185" />
              </g>

              {/* Moving AI scan line */}
              <rect x="76" y="72" width="248" height="22" fill="url(#scan-glow)" opacity="0.35">
                <animate attributeName="y" values="62;214;62" dur="3.4s" repeatCount="indefinite" />
              </rect>
              <line x1="84" y1="83" x2="316" y2="83" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.9">
                <animate attributeName="y1" values="73;225;73" dur="3.4s" repeatCount="indefinite" />
                <animate attributeName="y2" values="73;225;73" dur="3.4s" repeatCount="indefinite" />
              </line>

              {/* Analysis metrics */}
              <g transform="translate(92 226)">
                <rect x="0" y="0" width="78" height="18" rx="5" fill="#0f172a" stroke="#1e293b" />
                <rect x="7" y="7" width="42" height="4" rx="2" fill="#38bdf8" opacity="0.75" />
                <rect x="54" y="7" width="13" height="4" rx="2" fill="#22c55e" opacity="0.75" />
              </g>
            </svg>

            {/* LIVE CCTV stream card (Top-Left) */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-lg max-w-[120px] scale-90 sm:scale-100 origin-top-left flex flex-col gap-1 z-10">
              <div className="relative aspect-video rounded overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute top-1 left-1 animate-ping" />
                <span className="text-[7px] text-blue-400 font-bold absolute top-0.5 left-3">AI</span>
                <div className="w-full h-full flex items-center justify-center opacity-40" />
              </div>
            </div>

            {/* Danger Event Card (Top-Right) */}
            <div className="absolute top-4 right-4 bg-rose-950/70 border border-rose-500/50 rounded-lg p-2 shadow-lg scale-90 sm:scale-100 origin-top-right flex flex-col gap-0.5 max-w-[140px] backdrop-blur-sm z-10 animate-bounce">
              <div className="flex items-center gap-1.5 text-rose-400">
                <Bell className="w-3.5 h-3.5 fill-rose-500/20" />
                <span className="text-[10px] font-extrabold tracking-wide">낙상 위험 감지</span>
              </div>
              <p className="text-[8px] text-slate-300 font-medium">13:02:15 | CCTV-02</p>
            </div>

            {/* Normal CCTV Sensor status overlay (Bottom-Right) */}
            <div className="absolute bottom-4 right-4 bg-slate-900/85 border border-slate-800 rounded-lg py-1.5 px-3 shadow-lg scale-90 sm:scale-100 origin-bottom-right flex items-center gap-2 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-extrabold text-white leading-none">AI 분석 중</p>
                <p className="text-[8px] text-emerald-400 font-semibold mt-0.5">실시간 관제 연결</p>
              </div>
            </div>
          </div>

          {/* System Key Highlights */}
          <div className="space-y-4 max-w-lg mt-4 lg:mt-5">
            {/* Highlight 1 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-snug">통합 관제로 더 안전한 환경을 만듭니다.</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  실시간 모니터링과 AI 분석으로 위험을 사전에 감지하고 신속하게 대응합니다.
                </p>
              </div>
            </div>

            {/* Highlight 2 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Monitor className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-snug">언제 어디서나 안전을 관리하세요.</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  PC와 모바일에서 실시간으로 관제 현황 및 이상 행동 기록을 쉽게 확인할 수 있습니다.
                </p>
              </div>
            </div>

            {/* Highlight 3 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-snug">개인과 기업 모두를 위한 맞춤형 서비스</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  가정 내 노약자 케어부터 의료 시설 및 기업 빌딩 관제까지 다양한 맞춤형 솔루션을 지원합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SECTION: Glassmorphic Login Card ================= */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#0a1224]/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            {/* Ambient card top light glow */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">로그인</h2>
              <p className="text-xs text-slate-400 font-medium">계정 정보를 입력하여 시스템에 접속하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ID Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">아이디</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex.5 items-center pointer-events-none flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="w-full pl-10 pr-4 py-3 bg-[#070e1b]/80 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">비밀번호</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-10 pr-10 py-3 bg-[#070e1b]/80 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remembers & Find */}
              <div className="flex items-center justify-between text-[10px] pt-1">
                <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberId}
                    onChange={(e) => setRememberId(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#070e1b] border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>아이디 저장</span>
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="text-slate-400 hover:text-blue-400 hover:underline transition-colors font-medium"
                >
                  비밀번호 찾기
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </form>

            {/* Separator OR */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative px-3 bg-[#0a1224] text-[10px] font-bold text-slate-500 uppercase tracking-wider">또는</span>
            </div>

            {/* Account Type selectors */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {/* Individual */}
              <button
                type="button"
                onClick={() => setLoginType('individual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  loginType === 'individual'
                    ? 'border-blue-500/80 bg-blue-600/5 shadow-inner'
                    : 'border-slate-800/80 hover:border-slate-700/60 bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${loginType === 'individual' ? 'bg-blue-500' : 'bg-transparent border border-slate-700'}`} />
                  <User className={`w-3.5 h-3.5 ${loginType === 'individual' ? 'text-blue-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-[10px] font-bold ${loginType === 'individual' ? 'text-blue-400' : 'text-slate-300'}`}>개인용</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-tight">카메라 등록 가능</p>
              </button>

              {/* Corporate */}
              <button
                type="button"
                onClick={() => setLoginType('corporate')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  loginType === 'corporate'
                    ? 'border-emerald-500/80 bg-emerald-600/5 shadow-inner'
                    : 'border-slate-800/80 hover:border-slate-700/60 bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${loginType === 'corporate' ? 'bg-emerald-500' : 'bg-transparent border border-slate-700'}`} />
                  <Building className={`w-3.5 h-3.5 ${loginType === 'corporate' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-[10px] font-bold ${loginType === 'corporate' ? 'text-emerald-400' : 'text-slate-300'}`}>기업용</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-tight">기관 담당자</p>
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => setLoginType('admin')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  loginType === 'admin'
                    ? 'border-violet-500/80 bg-violet-600/5 shadow-inner'
                    : 'border-slate-800/80 hover:border-slate-700/60 bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${loginType === 'admin' ? 'bg-violet-500' : 'bg-transparent border border-slate-700'}`} />
                  <Shield className={`w-3.5 h-3.5 ${loginType === 'admin' ? 'text-violet-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-[10px] font-bold ${loginType === 'admin' ? 'text-violet-400' : 'text-slate-300'}`}>관리자</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-tight">통합 관제 admin</p>
              </button>
            </div>

            {/* Sign Up Link — admin에게는 숨김 */}
            {loginType !== 'admin' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => onNavigateToSignUp(loginType === 'individual' ? 'personal' : 'corporate')}
                  className="w-full py-3 bg-[#0a1224] border border-slate-800 hover:border-slate-700 hover:bg-[#0d162d] text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  회원가입
                </button>

                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-medium">계정이 없으신가요? </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToSignUp(loginType === 'individual' ? 'personal' : 'corporate')}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors ml-1"
                  >
                    회원가입으로 시작하세요.
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
