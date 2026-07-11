import { useCallback, useEffect, useState } from 'react';
import { getBackendWsUrl } from '../../../shared/api/client';
import { SimpleStompClient } from '../../../shared/utils/stomp';
import { logger } from '../../../shared/utils/logger';
import {
  isVlmSnapshotAssistMessage,
  type VlmSnapshotAssistResult,
} from '../types/vlmSnapshotAssist';

/**
 * Non-blocking map of eventId → VLM snapshot assist result.
 * Alert list/ack must not wait on this feed.
 */
export function useVlmSnapshotAssist(enabled = true) {
  const [byEventId, setByEventId] = useState<ReadonlyMap<string, VlmSnapshotAssistResult>>(
    () => new Map(),
  );

  const upsert = useCallback((result: VlmSnapshotAssistResult) => {
    setByEventId((prev) => {
      const next = new Map(prev);
      next.set(result.eventId, result);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const url = getBackendWsUrl('/ws');
    const client = new SimpleStompClient({
      url,
      topic: '/topic/vlm-snapshot-assist',
      onMessage: (json: unknown) => {
        if (isVlmSnapshotAssistMessage(json)) {
          upsert(json);
        }
      },
      onStatusChange: (status) => {
        logger.info(`[useVlmSnapshotAssist] status=${status}`);
      },
    });
    client.connect();
    return () => {
      client.disconnect();
    };
  }, [enabled, upsert]);

  const getAssist = useCallback(
    (eventId: string | null | undefined) => {
      if (!eventId) return undefined;
      return byEventId.get(eventId);
    },
    [byEventId],
  );

  return { byEventId, getAssist, upsert };
}
