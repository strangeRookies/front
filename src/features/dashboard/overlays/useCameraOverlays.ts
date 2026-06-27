import { useEffect, useMemo, useRef } from 'react';
import { getBackendWsUrl } from '../../../shared/api/client';
import { logger } from '../../../shared/utils/logger';
import { SimpleStompClient } from '../../../shared/utils/stomp';
import { useCameraOverlayStore } from './overlayStore';
import { parseOverlayMessage } from './overlayTypes';

const OVERLAY_TTL_MS = 2_000;

function overlayTopic(facilityId: number | string, userType: 'individual' | 'corporate') {
  return userType === 'corporate'
    ? `/topic/company/${facilityId}/camera-overlays`
    : `/topic/facility/${facilityId}/camera-overlays`;
}

export function useCameraOverlays(
  facilityId?: number | string,
  userType: 'individual' | 'corporate' = 'individual',
): void {
  const wsUrl = getBackendWsUrl('/ws');
  const timeoutRefs = useRef<Map<string, number>>(new Map());
  const timestampRefs = useRef<Map<string, number>>(new Map());
  const setOverlay = useCameraOverlayStore((state) => state.setOverlay);
  const clearOverlayFromStore = useCameraOverlayStore((state) => state.clearOverlay);
  const clearAllOverlays = useCameraOverlayStore((state) => state.clearAllOverlays);
  const topic = useMemo(
    () => (facilityId ? overlayTopic(facilityId, userType) : null),
    [facilityId, userType],
  );

  useEffect(() => {
    for (const timeoutId of timeoutRefs.current.values()) {
      window.clearTimeout(timeoutId);
    }
    timeoutRefs.current.clear();
    timestampRefs.current.clear();
    clearAllOverlays();

    if (!topic) {
      return undefined;
    }

    logger.info(`[Overlay] Connecting to topic: ${topic}`);

    const scheduleClear = (cameraLoginId: string) => {
      const existing = timeoutRefs.current.get(cameraLoginId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timeoutId = window.setTimeout(() => {
        timeoutRefs.current.delete(cameraLoginId);
        timestampRefs.current.delete(cameraLoginId);
        clearOverlayFromStore(cameraLoginId);
      }, OVERLAY_TTL_MS);

      timeoutRefs.current.set(cameraLoginId, timeoutId);
    };

    const clearOverlay = (cameraLoginId: string) => {
      const timeoutId = timeoutRefs.current.get(cameraLoginId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutRefs.current.delete(cameraLoginId);
      }
      timestampRefs.current.delete(cameraLoginId);
      clearOverlayFromStore(cameraLoginId);
    };

    const client = new SimpleStompClient({
      url: wsUrl,
      topic,
      onMessage: (raw: unknown) => {
        const message = parseOverlayMessage(raw);
        if (!message) {
          logger.warn('[Overlay] Ignoring invalid overlay payload.');
          return;
        }

        if (message.events.length === 0) {
          clearOverlay(message.cameraLoginId);
          return;
        }

        const latestTimestamp = timestampRefs.current.get(message.cameraLoginId);
        if (latestTimestamp !== undefined && message.timestampMs < latestTimestamp) {
          return;
        }

        timestampRefs.current.set(message.cameraLoginId, message.timestampMs);
        setOverlay(message);
        scheduleClear(message.cameraLoginId);
      },
      onStatusChange: (status) => {
        logger.info(`[Overlay] STOMP status: ${status}`);
      },
    });

    client.connect();

    return () => {
      client.disconnect();
      for (const timeoutId of timeoutRefs.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timeoutRefs.current.clear();
      timestampRefs.current.clear();
      clearAllOverlays();
    };
  }, [clearAllOverlays, clearOverlayFromStore, setOverlay, topic, wsUrl]);
}
