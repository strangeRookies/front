import { useEffect, useState } from 'react';
import { z } from 'zod';

const unknownRecordSchema = z.record(z.string(), z.unknown());
const aiEventSchema = z.object({
  camera_id: z.string(),
  frame_idx: z.number().default(0),
  timestamp: z.number(),
  event_type: z.string(),
  score: z.number().default(0),
  confidence: z.number().default(0),
  boxes: z.array(unknownRecordSchema).default([]),
  bbox: z.unknown().nullable().optional(),
  threshold: z.number().default(0),
  track_id: z.union([z.string(), z.number()]).nullable().optional(),
  severity: z.string().default('HIGH'),
});

export interface AiEvent {
  readonly camera_id: string;
  readonly frame_idx: number;
  readonly timestamp: number;
  readonly event_type: string;
  readonly score: number;
  readonly confidence: number;
  readonly boxes: readonly Record<string, unknown>[];
  readonly bbox: unknown;
  readonly threshold: number;
  readonly track_id: string | null;
  readonly severity: string;
}

interface UseAiEventsOptions {
  readonly url?: string;
  readonly enabled?: boolean;
}

export function useAiEvents(input: string | UseAiEventsOptions = {}) {
  const options = typeof input === 'string' ? { url: input, enabled: true } : input;
  const url = options.url ?? 'http://localhost:8010/events';
  const enabled = options.enabled ?? true;
  const [events, setEvents] = useState<AiEvent[]>([]);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      return undefined;
    }

    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      try {
        const parsed = aiEventSchema.parse(JSON.parse(event.data));
        const normalized: AiEvent = {
          ...parsed,
          bbox: parsed.bbox ?? null,
          track_id: parsed.track_id === null || parsed.track_id === undefined ? null : String(parsed.track_id),
        };
        setEvents((prev) => [normalized, ...prev].slice(0, 50));
      } catch (error) {
        if (error instanceof SyntaxError || error instanceof z.ZodError) {
          console.warn('Ignoring malformed AI event payload:', error.message);
          return;
        }
        throw error;
      }
    };

    eventSource.onerror = () => {
      console.warn('AI event stream disconnected.');
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, url]);

  return events;
}
