import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { aiEventFingerprint } from '../../shared/utils/aiAlerts';
import type { AiEvent } from '../../hooks/useAiEvents';
import { AiAlertCard } from './AiAlertCard';

interface AiDangerPanelProps {
  readonly events: readonly AiEvent[];
  readonly acknowledgedEventIds: ReadonlySet<string>;
  readonly onFocus: (event: AiEvent) => void;
  readonly onConfirm: (event: AiEvent) => void;
  readonly fallback?: ReactNode;
}

export function AiDangerPanel({ events, acknowledgedEventIds, onFocus, onConfirm, fallback }: AiDangerPanelProps) {
  if (events.length === 0) {
    if (fallback) return <>{fallback}</>;

    return (
      <>
        <div className="py-8 text-center text-slate-500">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">현재 감지된 이상 상황이 없습니다.</p>
          <p className="text-[10px] mt-1 text-slate-600">실시간 모니터링 중입니다.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {events.map(event => (
        <AiAlertCard
          key={aiEventFingerprint(event)}
          event={event}
          acknowledged={acknowledgedEventIds.has(aiEventFingerprint(event))}
          onFocus={onFocus}
          onConfirm={onConfirm}
        />
      ))}
    </>
  );
}
