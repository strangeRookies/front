import type { AiEvent } from '../../hooks/useAiEvents';
import { rawApiRequest } from '../../shared/api/client';
import { aiEventKey } from '../../shared/utils/aiAlerts';

export const ACKNOWLEDGE_RECORDING_FRAMES = {
  preFrames: 150,
  postFrames: 150,
  totalFrames: 300,
} as const;

export interface AcknowledgeRecordingRequest {
  readonly eventId: string;
  readonly cameraId: string;
  readonly eventType: string;
  readonly eventTimestamp: string;
  readonly preFrames: number;
  readonly postFrames: number;
  readonly totalFrames: number;
  readonly status: 'acknowledged';
  readonly reason: 'acknowledged';
  readonly acknowledgedBy?: string;
}

export interface AcknowledgeRecordingResponse {
  readonly eventId: string;
  readonly cameraId: string;
  readonly eventType: string;
  readonly eventTimestamp: string;
  readonly acknowledgedAt: string;
  readonly acknowledgedBy?: string;
  readonly preFrames: number;
  readonly postFrames: number;
  readonly totalFrames: number;
  readonly recordingStatus: 'RECORDING_REQUESTED' | 'PENDING_CLIP_CAPTURE';
}

export function buildAcknowledgeRecordingRequest(event: AiEvent, acknowledgedBy?: string): AcknowledgeRecordingRequest {
  return {
    eventId: aiEventKey(event),
    cameraId: event.camera_id,
    eventType: event.event_type,
    eventTimestamp: new Date(event.timestamp * 1000).toISOString(),
    ...ACKNOWLEDGE_RECORDING_FRAMES,
    status: 'acknowledged',
    reason: 'acknowledged',
    acknowledgedBy,
  };
}

export async function acknowledgeAndRequestRecording(
  event: AiEvent,
  acknowledgedBy?: string,
): Promise<AcknowledgeRecordingResponse> {
  const request = buildAcknowledgeRecordingRequest(event, acknowledgedBy);
  return rawApiRequest<AcknowledgeRecordingResponse>(
    `/api/incidents/${encodeURIComponent(request.eventId)}/acknowledge-and-record`,
    {
      method: 'POST',
      body: request,
    },
  );
}
