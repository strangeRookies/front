import { Camera, ShieldAlert, Brain, TrendingUp, TrendingDown } from "lucide-react";

interface CCTVStatsCardsProps {
  activeFeedsCount: number;
  totalFeedsCount: number;
  alertsCount: number;
  /** 최근 24시간 AI 오탐률(%). 신뢰도 100% = 오탐률 0%라는 전제로 (1 - 평균 신뢰도)로 계산됨. 데이터 없으면 null. */
  falsePositiveRatePercent?: number | null;
  /** ratePercent - 직전 24시간 오탐률. 음수면 개선. 데이터 없으면 null. */
  falsePositiveRateDeltaPercent?: number | null;
}

export function CCTVStatsCards({
  activeFeedsCount = 4,
  totalFeedsCount = 4,
  alertsCount = 2,
  falsePositiveRatePercent = null,
  falsePositiveRateDeltaPercent = null,
}: CCTVStatsCardsProps) {
  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800/50 divide-y divide-slate-800/50">

      {/* 시스템 상태 */}
      <div className="p-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">시스템 상태</span>
        <div className="space-y-1.5">

          {/* CCTV 작동 상태 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-200 font-semibold">CCTV 작동 상태</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-extrabold text-white">{activeFeedsCount}/{totalFeedsCount}</span>
              <span className="text-[9px] text-slate-400 font-bold">채널</span>
            </div>
          </div>

          {/* 금일 이상 거동 감지 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-200 font-semibold">금일 이상 거동 감지</span>
            </div>
            <span className="text-[11px] font-extrabold text-white">{alertsCount}건</span>
          </div>

          {/* AI 오탐률 (최근 24시간, 1 - 평균 신뢰도 기준) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-200 font-semibold">
                AI 오탐률<span className="text-slate-500 font-normal"> (최근 24시간)</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-extrabold text-white">
                {falsePositiveRatePercent != null ? `${falsePositiveRatePercent.toFixed(1)}%` : '—'}
              </span>
              {falsePositiveRateDeltaPercent != null && (
                <span
                  className={`text-[8px] font-bold flex items-center gap-0.5 ${
                    falsePositiveRateDeltaPercent <= 0 ? 'text-blue-400' : 'text-rose-400'
                  }`}
                >
                  {falsePositiveRateDeltaPercent <= 0 ? (
                    <TrendingDown className="w-2.5 h-2.5" />
                  ) : (
                    <TrendingUp className="w-2.5 h-2.5" />
                  )}
                  {falsePositiveRateDeltaPercent > 0 ? '+' : ''}
                  {falsePositiveRateDeltaPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
