import { Camera, ShieldAlert, Brain, TrendingUp } from "lucide-react";

interface CCTVStatsCardsProps {
  activeFeedsCount: number;
  totalFeedsCount: number;
  alertsCount: number;
}

export function CCTVStatsCards({
  activeFeedsCount = 4,
  totalFeedsCount = 4,
  alertsCount = 2,
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

          {/* AI 오탐률 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-200 font-semibold">AI 오탐률</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-extrabold text-white">1.2%</span>
              <span className="text-[8px] font-bold text-blue-400 flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />-0.4%
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
