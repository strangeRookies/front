import { AlertTriangle, Camera, Check, Clock, ThumbsDown, ThumbsUp, Pause, Shield } from 'lucide-react';
import type { AiEvent } from '../../hooks/useAiEvents';
import { formatAiEventLabel, getEventTypeKorean } from '../../shared/utils/aiAlerts';

// 이벤트 유형별 컬러 코딩 (23.md 2순위 UI/UX 개선)
function getEventTypeStyle(eventType: string): {
  border: string;
  bg: string;
  glow: string;
  textColor: string;
  badgeBg: string;
} {
  const upper = eventType.toUpperCase();
  if (upper.includes('FAINT') || upper.includes('SYNCOPE')) {
    return {
      border: 'border-red-500/60',
      bg: 'bg-red-900/25',
      glow: 'shadow-[0_0_18px_rgba(239,68,68,0.25)]',
      textColor: 'text-red-400',
      badgeBg: 'border-red-500/25 bg-red-950/50 text-red-300',
    };
  }
  if (upper.includes('FALL') || upper.includes('COLLAPSE')) {
    return {
      border: 'border-orange-500/60',
      bg: 'bg-orange-900/20',
      glow: 'shadow-[0_0_18px_rgba(249,115,22,0.20)]',
      textColor: 'text-orange-400',
      badgeBg: 'border-orange-500/25 bg-orange-950/50 text-orange-300',
    };
  }
  if (upper.includes('FIGHT') || upper.includes('VIOLENCE') || upper.includes('ASSAULT')) {
    return {
      border: 'border-violet-500/60',
      bg: 'bg-violet-900/20',
      glow: 'shadow-[0_0_18px_rgba(139,92,246,0.20)]',
      textColor: 'text-violet-400',
      badgeBg: 'border-violet-500/25 bg-violet-950/50 text-violet-300',
    };
  }
  // 기타 위험 이벤트
  return {
    border: 'border-red-500/50',
    bg: 'bg-red-900/20',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.20)]',
    textColor: 'text-red-400',
    badgeBg: 'border-red-500/20 bg-red-950/50 text-red-300/80',
  };
}

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
  if (event.event_type === 'Normal') {
    return null;
  }

  const style = getEventTypeStyle(event.event_type);
  const koreanLabel = getEventTypeKorean(event.event_type);
  const typeUpper = event.event_type.trim().toUpperCase();

  const timeMs = event.timestamp > 1e10 ? event.timestamp : event.timestamp * 1000;
  const detectedAt = new Date(timeMs);
  const timeStr = detectedAt.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const confidencePct = event.confidence > 0
    ? Math.round(event.confidence * 100) + '%'
    : event.score > 0
      ? Math.round(event.score * 100) + '%'
      : null;

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
        acknowledged
          ? 'border-slate-700 bg-slate-900/50 opacity-60'
          : `${style.border} ${style.bg} ${style.glow}`
      }`}
    >
      {!acknowledged && <div className={`absolute inset-0 ${style.bg} animate-pulse opacity-40`} />}

      <div className="relative z-10 space-y-3">
        {/* 헤더: 이벤트 유형 + 배지 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`rounded-full p-1.5 flex-shrink-0 ${acknowledged ? 'bg-emerald-500/15 text-emerald-300' : `bg-red-500/20 ${style.textColor}`}`}>
              {acknowledged ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h4 className={`truncate text-sm font-bold leading-tight ${acknowledged ? 'text-slate-300' : style.textColor}`}>
                {koreanLabel} 의심
              </h4>
              {!acknowledged && (
                <p className="mt-0.5 truncate text-[10px] text-slate-400">이상 상황이 감지되었습니다</p>
              )}
            </div>
          </div>
          <span className={`max-w-full self-start truncate rounded-md border px-2 py-1 font-mono text-[10px] ${style.badgeBg}`}>
            {formatAiEventLabel(event)}
          </span>
        </div>

        {/* 세부 정보 그리드 (23.md 2순위: 이벤트 카드 필수 표시 정보) */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Camera className="h-3 w-3 flex-shrink-0 text-slate-500" />
            <span className="truncate">{event.camera_id}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3 w-3 flex-shrink-0 text-slate-500" />
            <span className="truncate font-mono">{timeStr}</span>
          </div>
          {confidencePct && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="h-3 w-3 flex-shrink-0 text-slate-500" />
              <span>신뢰도: <span className="font-bold text-white">{confidencePct}</span></span>
            </div>
          )}
          {event.track_id && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-slate-500 font-mono text-[10px]">ID:</span>
              <span className="font-mono text-white">{event.track_id}</span>
            </div>
          )}
        </div>

        {/* 조치 상태 + 액션 버튼 */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${acknowledged ? 'text-emerald-400' : 'text-amber-400'}`}>
            {acknowledged ? '● 확인 완료' : '● 미확인'}
          </span>

          <div className="flex items-center gap-1.5">
            {/* 오탐/정탐 피드백 버튼 (23.md 4순위: Human-in-the-Loop) */}
            {onFeedback && (
              <>
                <button
                  type="button"
                  title="정탐 (True Positive)"
                  onClick={(e) => { e.stopPropagation(); onFeedback(event, 'true_positive'); }}
                  className="p-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 hover:bg-emerald-800/40 transition-colors"
                >
                  <ThumbsUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="오탐 (False Positive)"
                  onClick={(e) => { e.stopPropagation(); onFeedback(event, 'false_positive'); }}
                  className="p-1.5 rounded-lg bg-rose-900/30 border border-rose-700/30 text-rose-400 hover:bg-rose-800/40 transition-colors"
                >
                  <ThumbsDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="판단 보류"
                  onClick={(e) => { e.stopPropagation(); onFeedback(event, 'on_hold'); }}
                  className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:bg-slate-700/60 transition-colors"
                >
                  <Pause className="h-3 w-3" />
                </button>
              </>
            )}
            {!acknowledged && onConfirm && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onConfirm(event); }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-emerald-500"
              >
                확인하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
