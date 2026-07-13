import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiEvent } from '../../../hooks/useAiEvents';
import {
  aiEventFingerprint,
  findCameraForAiEvent,
  getEventTypeKorean,
  getSeverityTone,
} from '../../../shared/utils/aiAlerts';
import { acknowledgeAlertEvent } from '../api/alertEventsApi';
import type { LiveCamera } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';

interface UseDashboardAlertsParams {
  acknowledgedAiEventIds: ReadonlySet<string>;
  dangerAiEvents: readonly AiEvent[];
  liveCameras: readonly LiveCamera[];
  onAcknowledgeAiEventOnly: (event: AiEvent) => void;
}

interface HistoryFilters {
  searchDate: 'today' | 'week' | 'month';
  searchCamera: string;
  searchKeyword: string;
}

export function useDashboardAlerts({
  acknowledgedAiEventIds,
  dangerAiEvents,
  liveCameras,
  onAcknowledgeAiEventOnly,
}: UseDashboardAlertsParams) {
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [tick, setTick] = useState(0);

  const mergeRecentAlerts = useCallback((recentAlerts: readonly IncidentAlert[]) => {
    if (recentAlerts.length === 0) return;

    setAlerts((prev) => {
      const merged = new Map(prev.map((alert) => [alert.id, alert]));
      let changed = false;

      for (const alert of recentAlerts) {
        const existing = merged.get(alert.id);
        if (!existing) {
          merged.set(alert.id, alert);
          changed = true;
        } else if ((alert.snapshotUrl || alert.clipUrl) && !(existing.snapshotUrl || existing.clipUrl)) {
          // 실시간 WS로 먼저 들어온 항목엔 스냅샷이 없는데, 재조회 결과엔 이제 붙어있는 경우 갱신
          merged.set(alert.id, { ...existing, snapshotUrl: alert.snapshotUrl, clipUrl: alert.clipUrl });
          changed = true;
        }
      }

      if (!changed) return prev;
      return [...merged.values()].sort((a, b) => b.timestamp - a.timestamp);
    });
  }, []);

  useEffect(() => {
    if (dangerAiEvents.length === 0) return;

    setAlerts((prev) => {
      let updated = [...prev];
      let changed = false;

      for (const event of dangerAiEvents) {
        const fingerprint = aiEventFingerprint(event);
        const exists = updated.some((alert) => alert.id === fingerprint);

        if (!exists) {
          const cameraObj = findCameraForAiEvent(liveCameras, event);
          const cameraName = cameraObj?.name || event.camera_login_id || event.camera_id || '-';
          const timeString = new Date(event.timestamp * 1000).toTimeString().split(' ')[0];
          const eventType = event.event_type.toUpperCase();
          const label = `${eventType} (${getEventTypeKorean(event.event_type)}) 감지`;
          const severity = getSeverityTone(event.severity);
          const isAcknowledged = acknowledgedAiEventIds.has(fingerprint);

          updated = [
            {
              id: fingerprint,
              time: timeString,
              timestamp: event.timestamp * 1000,
              camera: cameraName,
              type: eventType,
              label,
              severity,
              status: isAcknowledged ? 'resolved' : 'new',
            },
            ...updated,
          ];
          changed = true;
        }
      }

      updated = updated.map((alert) => {
        if (acknowledgedAiEventIds.has(alert.id) && alert.status === 'new') {
          changed = true;
          return { ...alert, status: 'resolved' as const };
        }
        return alert;
      });

      return changed ? updated : prev;
    });
  }, [acknowledgedAiEventIds, dangerAiEvents, liveCameras]);

  useEffect(() => {
    const futureExpirations = alerts
      .map((a) => a.timestamp + 10 * 60 * 1000)
      .filter((t) => t > Date.now());

    if (futureExpirations.length === 0) return;

    const nextExpiration = Math.min(...futureExpirations);
    const delay = nextExpiration - Date.now() + 100; // 100ms buffer

    if (delay <= 0) {
      setTick((t) => t + 1);
      return;
    }

    const timerId = setTimeout(() => {
      setTick((t) => t + 1);
    }, delay);

    return () => clearTimeout(timerId);
  }, [alerts, tick]);

  const activeTenMinAlerts = useMemo(
    () => alerts.filter((alert) => Date.now() - alert.timestamp <= 10 * 60 * 1000),
    [alerts, tick],
  );

  const unresolvedTenMinAlertsCount = useMemo(
    () => activeTenMinAlerts.filter((alert) => alert.status === 'new').length,
    [activeTenMinAlerts],
  );

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.map((alert) => (
      alert.id === id ? { ...alert, status: 'resolved' as const } : alert
    )));

    if (!id.includes(':')) {
      void acknowledgeAlertEvent(id).catch(console.error);
      return;
    }
    const matchingEvent = dangerAiEvents.find((event) => aiEventFingerprint(event) === id);
    if (matchingEvent) onAcknowledgeAiEventOnly(matchingEvent);
  };

  return {
    alerts,
    activeTenMinAlerts,
    unresolvedTenMinAlertsCount,
    mergeRecentAlerts,
    resolveAlert,
  };
}
