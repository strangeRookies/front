import React, { useState } from 'react';
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

interface LoginPageProps {
  onLogin: (role: 'individual' | 'corporate', username: string) => void;
  onNavigateToSignUp: (type: 'personal' | 'corporate') => void;
}

export function LoginPage({ onLogin, onNavigateToSignUp }: LoginPageProps) {
  const [loginType, setLoginType] = useState<'individual' | 'corporate'>('individual');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('아이디를 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    // Simulate login
    onLogin(loginType, username);
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

          {/* Isometric CCTV SVG Room Illustration */}
          <div className="relative w-full aspect-[4/3] rounded-2xl border border-slate-800/80 bg-[#0a1122]/60 overflow-hidden flex items-center justify-center shadow-2xl p-4">
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-15" />
            
            <svg className="w-full h-full max-h-[300px] drop-shadow-[0_10px_20px_rgba(30,58,138,0.2)]" viewBox="0 0 400 300" fill="none">
              {/* Isometric grid representation (SVG polygon walls & rooms) */}
              <g transform="translate(40, -10)">
                {/* Outermost floor border */}
                <polygon points="160,80 300,150 160,220 20,150" fill="#0c1830" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
                
                {/* Rooms divides */}
                {/* Room 1 (Left) */}
                <polygon points="160,80 230,115 160,150 90,115" fill="#0f2042" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
                {/* Room 2 (Right) */}
                <polygon points="230,115 300,150 230,185 160,150" fill="#0f2042" stroke="#2563eb" strokeWidth="1" opacity="0.8" />
                {/* Corridor (Front-left) */}
                <polygon points="90,115 160,150 90,185 20,150" fill="#0d1b38" stroke="#1d4ed8" strokeWidth="1" opacity="0.8" />
                {/* Room 3 (Front-right) */}
                <polygon points="160,150 230,185 160,220 90,185" fill="#0f2042" stroke="#2563eb" strokeWidth="1" opacity="0.8" />

                {/* Animated light pulses / CCTV cones */}
                {/* Camera 5 representation */}
                <circle cx="230" cy="185" r="5" fill="#10b981" className="animate-pulse" />
                <polygon points="230,185 200,210 250,210" fill="url(#green-glow)" opacity="0.25" />

                {/* Camera 2 Alert representation */}
                <circle cx="160" cy="150" r="5" fill="#ef4444" className="animate-ping" style={{ animationDuration: '1.5s' }} />
                <circle cx="160" cy="150" r="5" fill="#ef4444" />
                <polygon points="160,150 130,100 190,100" fill="url(#red-glow)" opacity="0.3" />
              </g>

              {/* Define gradients for isometric camera cones */}
              <defs>
                <linearGradient id="green-glow" x1="230" y1="185" x2="230" y2="210" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981" stopOpacity="1" />
                  <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="red-glow" x1="160" y1="150" x2="160" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Overlays matching the photos */}
            {/* LIVE CCTV stream card (Top-Left) */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-lg max-w-[120px] scale-90 sm:scale-100 origin-top-left flex flex-col gap-1 z-10">
              <div className="relative aspect-video rounded overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 left-1 animate-ping" />
                <span className="text-[7px] text-rose-500 font-bold absolute top-0.5 left-3">LIVE</span>
                {/* Minimal camera grid indicator */}
                <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                  <span className="text-[9px] text-slate-400 font-mono">복도 A</span>
                </div>
              </div>
            </div>

            {/* Danger Event Card (Top-Right) */}
            <div className="absolute top-4 right-4 bg-rose-950/70 border border-rose-500/50 rounded-lg p-2 shadow-lg scale-90 sm:scale-100 origin-top-right flex flex-col gap-0.5 max-w-[140px] backdrop-blur-sm z-10 animate-bounce">
              <div className="flex items-center gap-1.5 text-rose-400">
                <Bell className="w-3.5 h-3.5 fill-rose-500/20" />
                <span className="text-[10px] font-extrabold tracking-wide">FALL 감지</span>
              </div>
              <p className="text-[8px] text-slate-300 font-medium">13:02:15 | 복도 A</p>
            </div>

            {/* Normal CCTV Sensor status overlay (Bottom-Right) */}
            <div className="absolute bottom-4 right-4 bg-slate-900/85 border border-slate-800 rounded-lg py-1.5 px-3 shadow-lg scale-90 sm:scale-100 origin-bottom-right flex items-center gap-2 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-extrabold text-white leading-none">CCTV 5</p>
                <p className="text-[8px] text-emerald-400 font-semibold mt-0.5">정상 작동 중</p>
              </div>
            </div>
          </div>

          {/* System Key Highlights */}
          <div className="space-y-4 max-w-lg">
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
              <div className="flex items-center justify-between text-xs pt-1">
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
                  onClick={() => alert('비밀번호 찾기 페이지 준비 중입니다.')}
                  className="text-slate-400 hover:text-blue-400 hover:underline transition-colors font-medium"
                >
                  비밀번호 찾기
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer mt-2"
              >
                로그인
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
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Individual Selector */}
              <button
                type="button"
                onClick={() => setLoginType('individual')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  loginType === 'individual'
                    ? 'border-blue-500/80 bg-blue-600/5 shadow-inner'
                    : 'border-slate-800/80 hover:border-slate-700/60 bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${loginType === 'individual' ? 'bg-blue-500' : 'bg-transparent border border-slate-700'}`} />
                  <User className={`w-4 h-4 ${loginType === 'individual' ? 'text-blue-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-[11px] font-bold ${loginType === 'individual' ? 'text-blue-400' : 'text-slate-300'}`}>개인용 로그인</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">개인 계정으로 로그인</p>
              </button>

              {/* Corporate Selector */}
              <button
                type="button"
                onClick={() => setLoginType('corporate')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  loginType === 'corporate'
                    ? 'border-emerald-500/80 bg-emerald-600/5 shadow-inner'
                    : 'border-slate-800/80 hover:border-slate-700/60 bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${loginType === 'corporate' ? 'bg-emerald-500' : 'bg-transparent border border-slate-700'}`} />
                  <Building className={`w-4 h-4 ${loginType === 'corporate' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <h4 className={`text-[11px] font-bold ${loginType === 'corporate' ? 'text-emerald-400' : 'text-slate-300'}`}>기업용 로그인</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">기업 계정으로 로그인</p>
              </button>
            </div>

            {/* Sign Up Link */}
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

          </div>
        </div>

      </div>
    </div>
  );
}
