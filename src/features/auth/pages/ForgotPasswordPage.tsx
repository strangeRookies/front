import { useState } from 'react';
import { ArrowLeft, Check, KeyRound, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';
import {
  confirmPasswordResetSms,
  requestPasswordResetSms,
  resetPassword,
} from '../api/authApi';
import { ApiError } from '../../../shared/api/client';
import {
  isValidEmail,
  isValidPassword,
  isValidRepresentativePhoneNumber,
  isValidVerificationCode,
  normalizeRepresentativePhoneNumber,
  PHONE_RULE_MESSAGE,
  SIGNUP_PASSWORD_RULE_MESSAGE,
} from '../../signup/utils/validation';
import { SMS_VERIFICATION_SENT_MESSAGE } from '../../signup/utils/signupMessages';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onResetComplete: () => void;
}

type ResetStep = 'identity' | 'verify' | 'password';

export function ForgotPasswordPage({ onBackToLogin, onResetComplete }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<ResetStep>('identity');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = normalizeRepresentativePhoneNumber(phone);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }
    if (!isValidEmail(email)) {
      alert('이메일 형식이 올바르지 않습니다. 예: user@example.com');
      return;
    }
    if (!phone.trim()) {
      alert('휴대폰 번호를 입력해주세요.');
      return;
    }
    if (!isValidRepresentativePhoneNumber(phone)) {
      alert(PHONE_RULE_MESSAGE);
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordResetSms(email.trim(), normalizedPhone);
      setVerificationToken('');
      setVerificationCode('');
      setStep('verify');
      alert(SMS_VERIFICATION_SENT_MESSAGE);
    } catch (error) {
      handlePasswordResetError(error, '인증번호 발송에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCode = async () => {
    if (step !== 'verify') {
      alert('인증번호를 먼저 발송해주세요.');
      setStep('identity');
      return;
    }
    if (!isValidVerificationCode(verificationCode)) {
      alert('인증번호는 숫자 6자리로 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await confirmPasswordResetSms({
        email: email.trim(),
        phone: normalizedPhone,
        code: verificationCode.trim(),
      });
      if (!response.verified) {
        alert('인증번호가 올바르지 않습니다.');
        return;
      }
      setVerificationToken(response.verificationToken);
      setStep('password');
      alert('휴대폰 본인 인증이 완료되었습니다.');
    } catch (error) {
      handlePasswordResetError(error, '인증번호 확인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!verificationToken) {
      alert('휴대폰 본인 인증을 다시 진행해주세요.');
      setStep('verify');
      return;
    }
    if (!isValidPassword(newPassword) || newPassword.length > 100) {
      alert(`${SIGNUP_PASSWORD_RULE_MESSAGE} 최대 100자까지 입력할 수 있습니다.`);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword({
        email: email.trim(),
        phone: normalizedPhone,
        verificationToken,
        newPassword,
      });
      onResetComplete();
    } catch (error) {
      handlePasswordResetError(error, '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNumber = step === 'identity' ? 1 : step === 'verify' ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#060a13] to-[#03050a] pointer-events-none" />

      <main className="relative z-10 w-full max-w-3xl">
        <button
          type="button"
          onClick={onBackToLogin}
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인으로 돌아가기
        </button>

        <section className="w-full bg-[#0a1224]/85 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-6 h-6 text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-blue-300">
                <ShieldCheck className="w-4 h-4" />
                PASSWORD RESET
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                비밀번호 찾기
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                가입한 이메일과 휴대폰 번호로 본인 인증 후 새 비밀번호를 설정합니다.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2">
            {['계정 확인', 'SMS 인증', '비밀번호 설정'].map((label, index) => {
              const active = index + 1 <= stepNumber;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${active ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    {index + 1 < stepNumber ? <Check className="w-4 h-4" /> : index + 1}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-bold ${active ? 'text-blue-300' : 'text-slate-600'}`}>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-5">
            {step === 'identity' && (
              <>
                <FieldLabel label="이메일" />
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="가입한 이메일을 입력해주세요"
                    className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <FieldLabel label="휴대폰 번호" />
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01012345678"
                    className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <ActionButton onClick={handleRequestCode} disabled={isSubmitting}>
                  인증번호 발송
                </ActionButton>
              </>
            )}

            {step === 'verify' && (
              <>
                <div className="rounded-xl border border-slate-800 bg-[#070e1b]/70 p-4">
                  <p className="text-xs text-slate-300 font-semibold">{email.trim()}</p>
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">{normalizedPhone}</p>
                </div>

                <FieldLabel label="인증번호" />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="인증번호 6자리를 입력해주세요"
                  className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono tracking-widest"
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                  <ActionButton onClick={handleConfirmCode} disabled={isSubmitting}>
                    인증 확인
                  </ActionButton>
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:min-w-[96px] shrink-0 px-5 py-3 rounded-xl border border-slate-800 bg-[#070e1b] text-xs font-bold text-slate-300 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    재발송
                  </button>
                </div>
              </>
            )}

            {step === 'password' && (
              <>
                <FieldLabel label="새 비밀번호" />
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="영문, 숫자, 특수문자 포함 8~100자"
                    className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <FieldLabel label="새 비밀번호 확인" />
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(event) => setNewPasswordConfirm(event.target.value)}
                    placeholder="새 비밀번호를 다시 입력해주세요"
                    className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <ActionButton onClick={handleResetPassword} disabled={isSubmitting}>
                  비밀번호 재설정
                </ActionButton>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <label className="block text-xs font-semibold text-slate-300">{label}</label>;
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 transition-all disabled:cursor-not-allowed"
    >
      {disabled ? '처리 중...' : children}
    </button>
  );
}

function handlePasswordResetError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.code === 'USER_NOT_FOUND') {
    alert('입력한 정보가 올바른 경우 인증 절차가 진행됩니다. 정보를 다시 확인해주세요.');
    return;
  }
  if (error instanceof ApiError && error.code === 'AUTH_INVALID_VERIFICATION') {
    alert('인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 확인해주세요.');
    return;
  }
  if (error instanceof ApiError && error.code === 'COMMON_INVALID_INPUT') {
    alert(PHONE_RULE_MESSAGE);
    return;
  }
  if (error instanceof ApiError && error.code === 'SMS_RATE_LIMITED') {
    alert('인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  if (error instanceof ApiError && error.code === 'SMS_SEND_FAILED') {
    alert('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  alert(fallbackMessage);
}
