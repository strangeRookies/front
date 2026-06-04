import type { AiEvent } from '../../hooks/useAiEvents';
import { aiEventKey } from '../utils/aiAlerts';

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

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
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/incidents/${encodeURIComponent(request.eventId)}/acknowledge-and-record`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new AcknowledgeRecordingError(response.status);
  }

  return response.json();
}

export class AcknowledgeRecordingError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Acknowledge recording request failed with HTTP ${status}`);
    this.name = 'AcknowledgeRecordingError';
    this.status = status;
  }
}
