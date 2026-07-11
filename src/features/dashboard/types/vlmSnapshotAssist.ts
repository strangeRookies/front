/** Side-channel VLM snapshot assist payload (never replaces primary alert). */
export type VlmSnapshotAssistStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface VlmSnapshotAssistResult {
  readonly messageType: 'vlm_snapshot_assist';
  readonly eventId: string;
  readonly cameraLoginId?: string;
  readonly status: VlmSnapshotAssistStatus;
  readonly summaryKo?: string | null;
  readonly errorMessage?: string | null;
  readonly updatedAt?: string | null;
}

export function isVlmSnapshotAssistMessage(raw: unknown): raw is VlmSnapshotAssistResult {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return o.messageType === 'vlm_snapshot_assist' && typeof o.eventId === 'string' && typeof o.status === 'string';
}
