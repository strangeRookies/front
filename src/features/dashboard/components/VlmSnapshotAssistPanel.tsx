import type { VlmSnapshotAssistResult } from '../types/vlmSnapshotAssist';

interface Props {
  readonly assist?: VlmSnapshotAssistResult | null;
  readonly eventId?: string | null;
}

/**
 * Optional “VLM 스냅샷 분석” panel. Late/missing/FAILED must not block alert UI.
 */
export function VlmSnapshotAssistPanel({ assist, eventId }: Props) {
  if (!eventId) {
    return null;
  }
  if (!assist) {
    return (
      <div className="vlm-snapshot-assist vlm-snapshot-assist--idle" data-testid="vlm-snapshot-assist">
        <div className="vlm-snapshot-assist__title">VLM 스냅샷 분석</div>
        <div className="vlm-snapshot-assist__body muted">분석 대기 중이거나 결과 없음 (알림은 정상 표시됩니다)</div>
      </div>
    );
  }
  return (
    <div
      className={`vlm-snapshot-assist vlm-snapshot-assist--${assist.status.toLowerCase()}`}
      data-testid="vlm-snapshot-assist"
      data-status={assist.status}
    >
      <div className="vlm-snapshot-assist__title">VLM 스냅샷 분석</div>
      <div className="vlm-snapshot-assist__status">상태: {assist.status}</div>
      {assist.status === 'SUCCESS' && assist.summaryKo ? (
        <div className="vlm-snapshot-assist__body">{assist.summaryKo}</div>
      ) : null}
      {assist.status === 'FAILED' ? (
        <div className="vlm-snapshot-assist__body muted">
          분석 실패{assist.errorMessage ? `: ${assist.errorMessage}` : ''} (기존 안전 알림은 유지됩니다)
        </div>
      ) : null}
      {assist.status === 'PENDING' ? (
        <div className="vlm-snapshot-assist__body muted">스냅샷 분석 중…</div>
      ) : null}
    </div>
  );
}
