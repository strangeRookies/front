export const MJPEG_STALE_FRAME_AGE_MS = 5000;
export const MJPEG_STALE_POLL_THRESHOLD = 3;
export const MJPEG_RECONNECT_COOLDOWN_MS = 10000;
export const MJPEG_RECONNECT_MAX_BACKOFF_MS = 60000;

export type MjpegStaleReason =
  | 'frame-age-stale'
  | 'processed-frame-stalled'
  | 'mjpeg-frame-stalled';

export type MjpegHealthErrorReason =
  | 'health-fetch-failed'
  | 'health-cors-failed'
  | 'health-url-invalid'
  | 'reconnect-cooldown-active';

export type MjpegHealthCounters = {
  readonly processedFrames: number;
  readonly mjpegFrames: number;
};

export function classifyHealthFetchError(err: unknown): MjpegHealthErrorReason {
  if (err instanceof TypeError) {
    return 'health-cors-failed';
  }
  return 'health-fetch-failed';
}

export function reconnectCooldownMs(reconnectAttempt: number): number {
  return Math.min(
    MJPEG_RECONNECT_MAX_BACKOFF_MS,
    MJPEG_RECONNECT_COOLDOWN_MS * (2 ** Math.max(0, reconnectAttempt)),
  );
}

export function staleReasonsForPayload(
  frameAge: number,
  processedFrames: number,
  mjpegFrames: number,
  streamClients: number,
  previous: MjpegHealthCounters | undefined,
): readonly MjpegStaleReason[] {
  if (!previous || streamClients <= 0) {
    return [];
  }

  const reasons: MjpegStaleReason[] = [];
  if (frameAge >= MJPEG_STALE_FRAME_AGE_MS) {
    reasons.push('frame-age-stale');
  }
  if (processedFrames <= previous.processedFrames) {
    reasons.push('processed-frame-stalled');
  }
  if (mjpegFrames <= previous.mjpegFrames) {
    reasons.push('mjpeg-frame-stalled');
  }
  return reasons;
}
