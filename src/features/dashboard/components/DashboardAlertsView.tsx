import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Clock } from 'lucide-react';
import type { IncidentAlert } from '../types/dashboard';

interface DashboardAlertsViewProps {
  alerts: readonly IncidentAlert[];
  unresolvedCount: number;
  onOpenIncident: (alert: IncidentAlert) => void;
  onResolveAlert: (id: string) => void;
}

export function DashboardAlertsView({
  alerts,
  unresolvedCount,
  onOpenIncident,
  onResolveAlert,
}: DashboardAlertsViewProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-white">이벤트 알림</h2>
          <p className="text-xs text-slate-400 mt-1">
            최근 10분 이내 수신된 실제 이벤트만 확인 대기 상태로 표시됩니다.
          </p>
        </div>
        <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold rounded-full text-xs">
          확인 대기 {unresolvedCount}건
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-16 text-center bg-[#071329] border border-dashed border-slate-800 rounded-2xl">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">현재 감지된 이상 상황이 없습니다.</p>
          <p className="mt-1 text-[10px] text-slate-600">최근 10분 동안 수신된 이벤트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const elapsedMs = Date.now() - alert.timestamp;
            const elapsedMins = Math.floor(elapsedMs / 60000);
            const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
            const remaining = 10 * 60 * 1000 - elapsedMs;
            const remMins = Math.floor(remaining / 60000);
            const remSecs = Math.floor((remaining % 60000) / 1000);

            return (
              <div
                key={alert.id}
                className={`bg-[#071329] border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  alert.severity === 'critical' ? 'border-rose-500/80' : 'border-amber-500/50'
                }`}
              >
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white">{alert.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono">[{alert.camera}]</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {alert.time}
                      </span>
                      <span className="text-rose-400 font-semibold">
                        발생 후 {elapsedMins}분 {elapsedSecs}초
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono">
                    표시 종료까지 {Math.max(remMins, 0)}분 {Math.max(remSecs, 0)}초
                  </span>
                  <button
                    onClick={() => onOpenIncident(alert)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    영상 확인
                  </button>
                  {alert.status === 'new' && (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      확인 완료
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
