import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type ResetStep = 'verifyUser' | 'verifyCode' | 'resetPassword';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onResetComplete: () => void;
}

const MOCK_AUTH_CODE = '123456';
const AUTH_LIMIT_SECONDS = 5 * 60;

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const getPasswordRules = (password: string) => [
  { label: '8자 이상', isValid: password.length >= 8 },
  { label: '영문 포함', isValid: /[A-Za-z]/.test(password) },
  { label: '숫자 포함', isValid: /\d/.test(password) },
  { label: '특수문자 포함', isValid: /[^A-Za-z0-9]/.test(password) },
];

export function ForgotPasswordPage({ onBackToLogin, onResetComplete }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<ResetStep>('verifyUser');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(AUTH_LIMIT_SECONDS);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRules = useMemo(() => getPasswordRules(newPassword), [newPassword]);
  const isPasswordValid = passwordRules.every((rule) => rule.isValid);
  const isPasswordMatched = newPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    if (step !== 'verifyCode') {
      return;
    }

    if (remainingSeconds <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [remainingSeconds, step]);

  const handleRequestAuthCode = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    if (!phone.trim()) {
      alert('휴대폰 번호를 입력해주세요.');
      return;
    }

    // TODO: SMS API 연동 후 USERS 테이블의 이메일/휴대폰 일치 여부를 서버에서 확인합니다.
    setAuthCode('');
    setRemainingSeconds(AUTH_LIMIT_SECONDS);
    setStep('verifyCode');
    alert(`개발용 Mock 인증번호는 ${MOCK_AUTH_CODE} 입니다.`);
  };

  const handleResendAuthCode = () => {
    setAuthCode('');
    setRemainingSeconds(AUTH_LIMIT_SECONDS);
    alert(`인증번호를 재전송했습니다. 개발용 Mock 인증번호는 ${MOCK_AUTH_CODE} 입니다.`);
  };

  const handleVerifyCode = (event: React.FormEvent) => {
    event.preventDefault();

    if (remainingSeconds <= 0) {
      alert('인증번호 유효시간이 만료되었습니다. 인증번호를 다시 받아주세요.');
      return;
    }

    if (authCode !== MOCK_AUTH_CODE) {
      alert('인증번호가 일치하지 않습니다.');
      return;
    }

    // resetToken은 보안상 localStorage에 저장하지 않고 현재 화면 state에만 보관합니다.
    setResetToken(`mock-reset-token-${Date.now()}`);
    setStep('resetPassword');
  };

  const handleResetPassword = (event: React.FormEvent) => {
    event.preventDefault();

    if (!resetToken) {
      alert('인증 확인 후 새 비밀번호를 설정할 수 있습니다.');
      setStep('verifyCode');
      return;
    }

    if (!isPasswordValid) {
      alert('비밀번호 조건을 모두 충족해주세요.');
      return;
    }

    if (!isPasswordMatched) {
      alert('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    // TODO: 비밀번호 변경 API 연동 시 resetToken과 새 비밀번호를 서버로 전달합니다.
    alert('비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.');
    onResetComplete();
  };

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#060a13] to-[#03050a] pointer-events-none" />

      <main className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <section className="lg:col-span-5 space-y-8">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </button>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-blue-300" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                비밀번호 찾기
              </h1>
              <p className="text-sm leading-6 text-slate-400">
                가입된 이메일과 휴대폰 번호를 확인한 뒤 인증번호로 본인 확인을 진행합니다.
              </p>
            </div>
          </div>

          <ol className="space-y-4">
            {[
              ['1단계', '사용자 확인', step === 'verifyUser'],
              ['2단계', '인증번호 확인', step === 'verifyCode'],
              ['3단계', '새 비밀번호 설정', step === 'resetPassword'],
            ].map(([order, label, isActive]) => (
              <li key={order as string} className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isActive ? 'bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.75)]' : 'bg-slate-700'
                  }`}
                />
                <div>
                  <p className="text-[11px] font-bold text-slate-500">{order}</p>
                  <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {label}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="lg:col-span-7">
          <div className="w-full bg-[#0a1224]/85 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

            {step === 'verifyUser' && (
              <form onSubmit={handleRequestAuthCode} className="space-y-6">
                <StepHeader
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="사용자 확인"
                  description="USERS 테이블에 등록된 이메일과 휴대폰 번호가 일치하는지 확인합니다."
                />

                <FormField
                  label="이메일"
                  icon={<Mail className="w-4 h-4" />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="example@email.com"
                />

                <FormField
                  label="휴대폰 번호"
                  icon={<Phone className="w-4 h-4" />}
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="010-0000-0000"
                />

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  인증번호 받기
                </button>
              </form>
            )}

            {step === 'verifyCode' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <StepHeader
                  icon={<Clock3 className="w-5 h-5" />}
                  title="인증번호 확인"
                  description="휴대폰으로 받은 6자리 인증번호를 입력해주세요."
                />

                <FormField
                  label="인증번호 6자리"
                  icon={<KeyRound className="w-4 h-4" />}
                  type="text"
                  value={authCode}
                  onChange={(value) => setAuthCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 bg-[#070e1b]/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Clock3 className="w-4 h-4 text-blue-300" />
                    남은 시간 {formatTime(remainingSeconds)}
                  </div>
                  <button
                    type="button"
                    onClick={handleResendAuthCode}
                    className="inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    인증번호 재전송
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  인증 확인
                </button>
              </form>
            )}

            {step === 'resetPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <StepHeader
                  icon={<Lock className="w-5 h-5" />}
                  title="새 비밀번호 설정"
                  description="인증이 완료되었습니다. 새 비밀번호를 입력해주세요."
                />

                <PasswordField
                  label="새 비밀번호"
                  value={newPassword}
                  onChange={setNewPassword}
                  isVisible={showNewPassword}
                  onToggleVisible={() => setShowNewPassword((value) => !value)}
                />

                <PasswordField
                  label="새 비밀번호 확인"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  isVisible={showConfirmPassword}
                  onToggleVisible={() => setShowConfirmPassword((value) => !value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {passwordRules.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                        rule.isValid
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-[#070e1b]/70 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {rule.label}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  비밀번호 변경
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StepHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-300">
        {icon}
        <p className="text-xs font-bold tracking-wide">PASSWORD RESET</p>
      </div>
      <h2 className="text-2xl font-extrabold text-white">{title}</h2>
      <p className="text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function FormField({
  label,
  icon,
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <span className="relative block">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          {icon}
        </span>
        <input
          {...inputProps}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#070e1b]/80 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
        />
      </span>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  isVisible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <span className="relative block">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          <Lock className="w-4 h-4" />
        </span>
        <input
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-[#070e1b]/80 border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
          placeholder="비밀번호를 입력해주세요"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </span>
    </label>
  );
}
