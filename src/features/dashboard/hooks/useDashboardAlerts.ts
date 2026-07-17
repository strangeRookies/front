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
    setAlerts((prev) => {
      const byId = new Map(prev.map((alert) => [alert.id, alert]));
      const bySource = new Map(
        prev
          .filter((alert) => alert.sourceEventId)
          .map((alert) => [String(alert.sourceEventId), alert]),
      );
      let changed = false;

      for (const alert of recentAlerts) {
        const existing =
          byId.get(alert.id) ||
          (alert.sourceEventId ? bySource.get(String(alert.sourceEventId)) : undefined);
        if (!existing) {
          byId.set(alert.id, alert);
          if (alert.sourceEventId) bySource.set(String(alert.sourceEventId), alert);
          changed = true;
          continue;
        }
        const merged: IncidentAlert = {
          ...existing,
          ...alert,
          id: existing.id,
          status: existing.status,
          clipUrl: alert.clipUrl ?? existing.clipUrl,
          primarySnapshotUrl: alert.primarySnapshotUrl ?? existing.primarySnapshotUrl,
          snapshotUrl: alert.snapshotUrl ?? existing.snapshotUrl,
          clipPath: alert.clipPath ?? existing.clipPath,
          sourceEventId: alert.sourceEventId ?? existing.sourceEventId,
        };
        if (existing.id !== merged.id) byId.delete(existing.id);
        byId.set(merged.id, merged);
        if (merged.sourceEventId) bySource.set(String(merged.sourceEventId), merged);
        changed = true;
      }

      if (!changed) return prev;
      return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
    });
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
  // Attach sourceEventId (original or eventId) for REST/WS dedupe alignment
  const sourceEventId = (event as any).originalEventId || event.eventId || undefined;
  return {
    id,
    time: new Date(timestamp).toTimeString().split(' ')[0],
    timestamp,
    camera: camera?.name || event.camera_login_id || event.camera_id || '-',
    cameraLoginId: event.camera_login_id || (event as AiEvent & { cameraLoginId?: string }).cameraLoginId || camera?.cameraLoginId,
    type: event.scenarioType!,
    label: presentation.label,
    severity: presentation.tone,
    status: acknowledgedAiEventIds.has(id) ? 'resolved' : 'new',
    clipUrl: event.clipUrl,
    clipPath: event.clipPath,
    snapshotUrl: event.snapshotUrl ?? event.primarySnapshotUrl,
    primarySnapshotUrl: event.primarySnapshotUrl ?? event.snapshotUrl,
    sourceEventId,
  };
}

function mergeIncidentAlerts(current: readonly IncidentAlert[], incoming: readonly IncidentAlert[]): IncidentAlert[] {
  const byId = new Map(current.map((alert) => [alert.id, alert]));
  const bySource = new Map(
    current
      .filter((alert) => alert.sourceEventId)
      .map((alert) => [String(alert.sourceEventId), alert]),
  );
  for (const alert of incoming) {
    const previous =
      byId.get(alert.id) ||
      (alert.sourceEventId ? bySource.get(String(alert.sourceEventId)) : undefined);
    const merged = previous
      ? {
          ...previous,
          ...alert,
          id: previous.id,
          status: previous.status,
          clipUrl: alert.clipUrl ?? previous.clipUrl,
          primarySnapshotUrl: alert.primarySnapshotUrl ?? previous.primarySnapshotUrl,
          snapshotUrl: alert.snapshotUrl ?? previous.snapshotUrl,
          clipPath: alert.clipPath ?? previous.clipPath,
          sourceEventId: alert.sourceEventId ?? previous.sourceEventId,
        }
      : alert;
    if (previous && previous.id !== merged.id) byId.delete(previous.id);
    byId.set(merged.id, merged);
    if (merged.sourceEventId) bySource.set(String(merged.sourceEventId), merged);
  }
  return [...byId.values()].sort((left, right) => right.timestamp - left.timestamp);
}
