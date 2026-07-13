import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { aiEventFingerprint, findCameraForAiEvent, getScenarioPresentation } from '../../../shared/utils/aiAlerts';
import { acknowledgeAlertEvent } from '../api/alertEventsApi';
import type { LiveCamera } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';

interface UseDashboardAlertsParams {
  acknowledgedAiEventIds: ReadonlySet<string>;
  dangerAiEvents: readonly AiEvent[];
  liveCameras: readonly LiveCamera[];
  onAcknowledgeAiEventOnly: (event: AiEvent) => void;
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
    setAlerts((prev) => mergeIncidentAlerts(prev, recentAlerts));
  }, []);

  useEffect(() => {
    if (dangerAiEvents.length === 0) return;
    const incoming = dangerAiEvents.map((event) => toIncidentAlert(event, liveCameras, acknowledgedAiEventIds));
    setAlerts((prev) => mergeIncidentAlerts(prev, incoming));
  }, [acknowledgedAiEventIds, dangerAiEvents, liveCameras]);

  useEffect(() => {
    const futureExpirations = alerts.map((alert) => alert.timestamp + 10 * 60 * 1000).filter((time) => time > Date.now());
    if (futureExpirations.length === 0) return;
    const delay = Math.min(...futureExpirations) - Date.now() + 100;
    const timerId = setTimeout(() => setTick((value) => value + 1), Math.max(delay, 0));
    return () => clearTimeout(timerId);
  }, [alerts, tick]);

  const activeTenMinAlerts = useMemo(() => alerts.filter((alert) => Date.now() - alert.timestamp <= 10 * 60 * 1000), [alerts, tick]);
  const unresolvedTenMinAlertsCount = useMemo(() => activeTenMinAlerts.filter((alert) => alert.status === 'new').length, [activeTenMinAlerts]);

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.map((alert) => alert.id === id ? { ...alert, status: 'resolved' as const } : alert));
    if (!id.includes(':')) {
      void acknowledgeAlertEvent(id).catch(console.error);
      return;
    }
    const matchingEvent = dangerAiEvents.find((event) => aiEventFingerprint(event) === id);
    if (matchingEvent) onAcknowledgeAiEventOnly(matchingEvent);
  };

  return { alerts, activeTenMinAlerts, unresolvedTenMinAlertsCount, mergeRecentAlerts, resolveAlert };
}

function toIncidentAlert(event: AiEvent, liveCameras: readonly LiveCamera[], acknowledgedAiEventIds: ReadonlySet<string>): IncidentAlert {
  const presentation = getScenarioPresentation(event.scenarioType!);
  const id = aiEventFingerprint(event);
  const camera = findCameraForAiEvent(liveCameras, event);
  const timestamp = event.capturedAtMs ?? (event.timestamp > 1e10 ? event.timestamp : event.timestamp * 1000);
  return {
    id,
    time: new Date(timestamp).toTimeString().split(' ')[0],
    timestamp,
    camera: camera?.name || event.camera_login_id || event.camera_id || '-',
    type: event.scenarioType!,
    label: presentation.label,
    severity: presentation.tone,
    status: acknowledgedAiEventIds.has(id) ? 'resolved' : 'new',
    clipUrl: event.clipUrl,
    clipPath: event.clipPath,
  };
}

function mergeIncidentAlerts(current: readonly IncidentAlert[], incoming: readonly IncidentAlert[]): IncidentAlert[] {
  const merged = new Map(current.map((alert) => [alert.id, alert]));
  for (const alert of incoming) {
    const previous = merged.get(alert.id);
    merged.set(alert.id, previous ? {
      ...previous,
      ...alert,
      status: previous.status,
      clipUrl: alert.clipUrl ?? previous.clipUrl,
      clipPath: alert.clipPath ?? previous.clipPath,
    } : alert);
  }
  return [...merged.values()].sort((left, right) => right.timestamp - left.timestamp);
}
