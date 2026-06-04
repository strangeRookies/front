import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { aiEventKey } from '../../app/utils/aiAlerts';
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
          <p className="text-xs font-semibold">AI 위험 알림 없음</p>
        </div>
        {fallback}
      </>
    );
  }

  return (
    <>
      {events.map(event => (
        <AiAlertCard
          key={aiEventKey(event)}
          event={event}
          acknowledged={acknowledgedEventIds.has(aiEventKey(event))}
          onFocus={onFocus}
          onConfirm={onConfirm}
        />
      ))}
    </>
  );
}
