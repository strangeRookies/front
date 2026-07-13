import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  HeartPulse,
  LogOut,
  Pause,
  PersonStanding,
  Shield,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from 'lucide-react';
import type { AiEvent } from '../../hooks/useAiEvents';
import { formatAiEventLabel, getScenarioPresentation } from '../../shared/utils/aiAlerts';

function getScenarioStyle(tone: 'critical' | 'warning' | 'info') {
  if (tone === 'critical') {
    return {
      border: 'border-red-500/60',
      bg: 'bg-red-900/25',
      glow: 'shadow-[0_0_18px_rgba(239,68,68,0.25)]',
      textColor: 'text-red-400',
      badgeBg: 'border-red-500/25 bg-red-950/50 text-red-300',
    };
  }
  if (tone === 'warning') {
    return {
      border: 'border-orange-500/60',
      bg: 'bg-orange-900/20',
      glow: 'shadow-[0_0_18px_rgba(249,115,22,0.20)]',
      textColor: 'text-orange-400',
      badgeBg: 'border-orange-500/25 bg-orange-950/50 text-orange-300',
    };
  }
  return {
    border: 'border-sky-500/60',
    bg: 'bg-sky-900/20',
    glow: 'shadow-[0_0_18px_rgba(14,165,233,0.20)]',
    textColor: 'text-sky-400',
    badgeBg: 'border-sky-500/25 bg-sky-950/50 text-sky-300',
  };
}

const scenarioIcons = {
  collapse: PersonStanding,
  syncope: HeartPulse,
  fall: AlertTriangle,
  exit: LogOut,
  hazard: TriangleAlert,
};

export type FeedbackType = 'true_positive' | 'false_positive' | 'on_hold';

interface AiAlertCardProps {
  readonly event: AiEvent;
  readonly acknowledged?: boolean;
  readonly onFocus?: (event: AiEvent) => void;
  readonly onConfirm?: (event: AiEvent) => void;
  readonly onFeedback?: (event: AiEvent, feedback: FeedbackType) => void;
}

export function AiAlertCard({
  event,
  acknowledged = false,
  onFocus,
  onConfirm,
  onFeedback,
}: AiAlertCardProps) {
  if (!event.scenarioType) {
    return null;
  }

  const presentation = getScenarioPresentation(event.scenarioType);
  const style = getScenarioStyle(presentation.tone);
  const ScenarioIcon = scenarioIcons[presentation.icon];
  const timeMs = event.capturedAtMs ?? (event.timestamp > 1e10 ? event.timestamp : event.timestamp * 1000);
  const timeStr = new Date(timeMs).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const confidencePct = event.confidence > 0
    ? `${Math.round(event.confidence * 100)}%`
    : event.score > 0 ? `${Math.round(event.score * 100)}%` : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onFocus?.(event)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          onFocus?.(event);
        }
      }}
      className={`relative mb-3 w-full overflow-hidden rounded-xl border p-4 text-left backdrop-blur-md transition-all ${
        acknowledged ? 'border-slate-700 bg-slate-900/50 opacity-60' : `${style.border} ${style.bg} ${style.glow}`
      }`}
    >
      {!acknowledged && <div className={`absolute inset-0 ${style.bg} animate-pulse opacity-40`} />}
      <div className="relative z-10 space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`rounded-full p-1.5 flex-shrink-0 ${acknowledged ? 'bg-emerald-500/15 text-emerald-300' : `bg-red-500/20 ${style.textColor}`}`}>
              {acknowledged ? <Check className="h-4 w-4" /> : <ScenarioIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h4 className={`truncate text-sm font-bold leading-tight ${acknowledged ? 'text-slate-300' : style.textColor}`}>
                {presentation.label}
              </h4>
              {!acknowledged && <p className="mt-0.5 truncate text-[10px] text-slate-400">이상 상황이 감지되었습니다.</p>}
            </div>
          </div>
          <span className={`max-w-full self-start truncate rounded-md border px-2 py-1 font-mono text-[10px] ${style.badgeBg}`}>
            {formatAiEventLabel(event)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400"><Camera className="h-3 w-3 flex-shrink-0 text-slate-500" /><span className="truncate">{event.camera_id}</span></div>
          <div className="flex items-center gap-1.5 text-slate-400"><Clock className="h-3 w-3 flex-shrink-0 text-slate-500" /><span className="truncate font-mono">{timeStr}</span></div>
          {confidencePct && <div className="flex items-center gap-1.5 text-slate-400"><Shield className="h-3 w-3 flex-shrink-0 text-slate-500" /><span>신뢰도: <span className="font-bold text-white">{confidencePct}</span></span></div>}
          {event.track_id && <div className="flex items-center gap-1.5 text-slate-400"><span className="text-slate-500 font-mono text-[10px]">ID:</span><span className="font-mono text-white">{event.track_id}</span></div>}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${acknowledged ? 'text-emerald-400' : 'text-amber-400'}`}>{acknowledged ? '확인 완료' : '미확인'}</span>
          <div className="flex items-center gap-1.5">
            {onFeedback && <>
              <button type="button" title="정확 (True Positive)" onClick={(clickEvent) => { clickEvent.stopPropagation(); onFeedback(event, 'true_positive'); }} className="p-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 hover:bg-emerald-800/40 transition-colors"><ThumbsUp className="h-3 w-3" /></button>
              <button type="button" title="오탐 (False Positive)" onClick={(clickEvent) => { clickEvent.stopPropagation(); onFeedback(event, 'false_positive'); }} className="p-1.5 rounded-lg bg-rose-900/30 border border-rose-700/30 text-rose-400 hover:bg-rose-800/40 transition-colors"><ThumbsDown className="h-3 w-3" /></button>
              <button type="button" title="판단 보류" onClick={(clickEvent) => { clickEvent.stopPropagation(); onFeedback(event, 'on_hold'); }} className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:bg-slate-700/60 transition-colors"><Pause className="h-3 w-3" /></button>
            </>}
            {!acknowledged && onConfirm && <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); onConfirm(event); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-emerald-500">확인하기</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
