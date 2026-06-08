import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onResetComplete: () => void;
}

export function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
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
          <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-6 h-6 text-blue-300" />
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-blue-300">
                  <ShieldCheck className="w-4 h-4" />
                  PASSWORD RESET
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  비밀번호 찾기 기능 준비 중
                </h1>
                <p className="text-sm leading-6 text-slate-400">
                  현재 백엔드 비밀번호 재설정 API가 아직 제공되지 않아 이 화면에서는 실제 비밀번호 변경을 진행하지 않습니다.
                  API가 준비되면 이메일/휴대폰 인증 후 새 비밀번호를 등록하는 흐름으로 연결하겠습니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#070e1b]/70 p-4">
                <p className="text-xs font-semibold text-slate-300">
                  로그인 정보가 기억나지 않는 경우 관리자에게 계정 확인을 요청해주세요.
                </p>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                로그인 화면으로 이동
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
