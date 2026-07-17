import type { VlmSnapshotAssistResult } from '../types/vlmSnapshotAssist';

interface Props {
  readonly assist?: VlmSnapshotAssistResult | null;
  readonly eventId?: string | null;
}

export function VlmSnapshotAssistPanel({ assist, eventId }: Props) {
  if (!eventId) {
    return null;
  }
  if (!assist) {
    return (
      <div className="vlm-snapshot-assist vlm-snapshot-assist--idle" data-testid="vlm-snapshot-assist">
        <div className="vlm-snapshot-assist__title">AI 감지 근거</div>
        <div className="vlm-snapshot-assist__body muted">
          분석 대기 중이거나 결과 없음 (안전 알림은 정상 표시됩니다)
        </div>
      </div>
    );
  }
  return (
    <div
      className={`vlm-snapshot-assist vlm-snapshot-assist--${assist.status.toLowerCase()}`}
      data-testid="vlm-snapshot-assist"
      data-status={assist.status}
    >
      <div className="vlm-snapshot-assist__title">AI 감지 근거</div>
      {assist.status === 'SUCCESS' && assist.summaryKo ? (
        <div className="vlm-snapshot-assist__body">{assist.summaryKo}</div>
      ) : null}
      {assist.status === 'FAILED' ? (
        <div className="vlm-snapshot-assist__body muted">
          AI 보조 설명을 불러오지 못했습니다. 기존 안전 이벤트는 정상 처리되었습니다.
          {assist.errorMessage ? ` (${assist.errorMessage})` : ''}
        </div>
      ) : null}
      {assist.status === 'PENDING' ? (
        <div className="vlm-snapshot-assist__body muted">AI가 이벤트 발생 장면을 분석하고 있습니다.</div>
      ) : null}
    </div>
  );
}