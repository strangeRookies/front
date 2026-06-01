import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, ShieldAlert, Brain, Timer, TrendingUp, Bell } from "lucide-react";

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
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-b *:data-[slot=card]:from-[#071329] *:data-[slot=card]:to-[#030817] *:data-[slot=card]:border-slate-800 *:data-[slot=card]:shadow-md sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: CCTV Status */}
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">CCTV 작동 상태</CardDescription>
          <CardAction>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 font-bold text-[10px]">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              100% 정상
            </Badge>
          </CardAction>
        </CardHeader>
        <CardHeader className="pt-0">
          <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-400" />
            {activeFeedsCount} / {totalFeedsCount} 채널
          </CardTitle>
          <p className="text-[10px] text-slate-500 font-medium mt-1">모든 카메라가 실시간 스트리밍 중입니다.</p>
        </CardHeader>
      </Card>

      {/* Card 2: Threats Detected */}
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">금일 이상 거동 감지</CardDescription>
          <CardAction>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center gap-1 font-bold text-[10px]">
              <Bell className="w-2.5 h-2.5 text-rose-400" />
              미해결 {alertsCount}건
            </Badge>
          </CardAction>
        </CardHeader>
        <CardHeader className="pt-0">
          <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
            {alertsCount} 건
          </CardTitle>
          <p className="text-[10px] text-slate-500 font-medium mt-1">최근 10분 내 FALL / FAINT 감지</p>
        </CardHeader>
      </Card>

      {/* Card 3: AI Processing */}
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">AI 오탐률</CardDescription>
          <CardAction>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1 font-bold text-[10px]">
              <TrendingUp className="w-2.5 h-2.5" />
              -0.4% 개선
            </Badge>
          </CardAction>
        </CardHeader>
        <CardHeader className="pt-0">
          <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-400" />
            1.2 %
          </CardTitle>
          <p className="text-[10px] text-slate-500 font-medium mt-1">YOLO v8 모델 미세 조정 적용 완료</p>
        </CardHeader>
      </Card>

      {/* Card 4: Avg Response Time */}
      <Card className="@container/card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-wider">평균 위험 대응 시간</CardDescription>
          <CardAction>
            <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 flex items-center gap-1 font-bold text-[10px]">
              골든타임 엄수
            </Badge>
          </CardAction>
        </CardHeader>
        <CardHeader className="pt-0">
          <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Timer className="w-6 h-6 text-emerald-400" />
            3분 45초
          </CardTitle>
          <p className="text-[10px] text-slate-500 font-medium mt-1">이벤트 감지 후 조치 해제까지 소요</p>
        </CardHeader>
      </Card>
    </div>
  );
}
