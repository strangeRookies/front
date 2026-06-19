import { useEffect, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { toast } from 'sonner';
import { getBackendWsUrl } from '../shared/api/client';
import { logger } from '../shared/utils/logger';

export interface SafetyEvent {
  cameraId?: string;
  type?: string;
  severity?: string;
  confidence?: number;
  timestamp?: string;
  bbox?: number[];
  trackId?: number | string;
}

export function useAlertWebSocket(onEventReceived?: (event: SafetyEvent) => void) {
  const [latestEvent, setLatestEvent] = useState<SafetyEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      brokerURL: getBackendWsUrl('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        logger.info('Connected to WebSocket for alerts.');
        setConnected(true);

        client.subscribe('/topic/alerts', (message: IMessage) => {
          if (message.body) {
            try {
              const event: SafetyEvent = JSON.parse(message.body);
              setLatestEvent(event);
              
              const severityLevel = event.severity?.toUpperCase();
              const severityLabel = severityLevel === 'CRITICAL' ? '🔴 위험' : '🟡 경고';
              const cameraLabel = event.cameraId ? `(카메라: ${event.cameraId})` : '';
              
              const title = `[${severityLabel}] 새로운 안전 이벤트 감지! ${cameraLabel}`;
              const description = `유형: ${event.type || '알 수 없음'} (신뢰도: ${Math.round((event.confidence || 0) * 100)}%)`;
              
              if (severityLevel === 'CRITICAL') {
                toast.error(title, { description, duration: 10000 });
              } else {
                toast.warning(title, { description, duration: 8000 });
              }

              if (onEventReceived) {
                onEventReceived(event);
              }
            } catch {
              logger.warn('Failed to parse incoming alert message.');
            }
          }
        });
      },
      onDisconnect: () => {
        logger.info('Disconnected from WebSocket.');
        setConnected(false);
      },
      onStompError: () => {
        logger.error('Broker reported a WebSocket error.');
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [onEventReceived]);

  return { latestEvent, connected };
}
