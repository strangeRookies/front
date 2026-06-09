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
    return (
      <>
        <div className="py-8 text-center text-slate-500">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">실시간 위험 이벤트 대기 중</p>
          <p className="text-[10px] mt-1 text-slate-600">새 MQTT/STOMP 이벤트가 들어오면 여기에 표시됩니다.</p>
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
