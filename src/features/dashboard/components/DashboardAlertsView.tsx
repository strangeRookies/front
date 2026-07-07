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
    <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto w-full">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-extrabold text-white">이벤트 알림</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            최근 10분 이내 수신 이벤트
          </p>
        </div>
        <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold rounded-full text-[11px] whitespace-nowrap">
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
              <button
                key={alert.id}
                onClick={() => onOpenIncident(alert)}
                className={`w-full bg-[#071329] border rounded-2xl p-4 flex flex-col gap-3 text-left cursor-pointer transition-colors hover:bg-slate-800/20 active:bg-slate-800/40 shadow-md ${
                  alert.severity === 'critical' ? 'border-rose-500/80' : 'border-amber-500/50'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">{alert.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">[{alert.camera}]</span>
                      </div>
                      <div className="flex flex-col text-[10px] text-slate-500 mt-1 gap-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {alert.time}
                        </span>
                        <span className="text-rose-400 font-semibold">
                          발생 후 {elapsedMins}분 {elapsedSecs}초 경과
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                    종료 {Math.max(remMins, 0)}:{Math.max(remSecs, 0).toString().padStart(2, '0')}
                  </div>
                </div>
                
                {alert.status === 'new' && (
                  <div 
                    className="w-full mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveAlert(alert.id);
                    }}
                  >
                    <div className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 active:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold text-center transition-colors">
                      확인완료
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
