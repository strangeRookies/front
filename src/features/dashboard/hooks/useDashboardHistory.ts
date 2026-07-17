import { useState, useEffect, useCallback } from 'react';
import type { AiEvent } from '../../../hooks/useAiEvents';
import { aiEventFingerprint, findCameraForAiEvent, getScenarioPresentation } from '../../../shared/utils/aiAlerts';
import { fetchFullAlertEventsHistory, toIncidentAlertFromRecentEvent } from '../api/alertEventsApi';
import type { HistoryFilters } from '../components/DashboardHistoryView';
import type { LiveCamera } from '../data/cameras';
import { ALL_CAMERAS_VALUE, type IncidentAlert } from '../types/dashboard';

interface UseDashboardHistoryParams {
  facilityIds: (number | string)[];
  liveCameras: readonly LiveCamera[];
  dangerAiEvents: readonly AiEvent[];
  acknowledgedAiEventIds: ReadonlySet<string>;
  filters: HistoryFilters;
  userType: 'individual' | 'corporate';
}

export function useDashboardHistory({ facilityIds, liveCameras, dangerAiEvents, acknowledgedAiEventIds, filters, userType }: UseDashboardHistoryParams) {
  const [historyAlerts, setHistoryAlerts] = useState<IncidentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const { searchCamera, searchDate, searchKeyword } = filters;
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchKeyword);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedKeyword(searchKeyword), 400);
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  const fetchHistoryPage = useCallback(async (pageNumber: number) => {
    if (facilityIds.length === 0) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const dateFrom = searchDate === 'today'
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        : searchDate === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const cameraId = searchCamera && searchCamera !== ALL_CAMERAS_VALUE ? searchCamera : undefined;
      const keyword = debouncedKeyword.trim() || undefined;
      const response = await fetchFullAlertEventsHistory(
        facilityIds[0], pageNumber, 50,
        { cameraId, keyword, dateFrom },
        userType,
      );
      setHistoryAlerts(response.content.map((event) => toIncidentAlertFromRecentEvent(event, liveCameras)).filter((event): event is IncidentAlert => !!event));
      setPage(response.number);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Failed to fetch full history', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedKeyword, facilityIds, liveCameras, searchCamera, searchDate, userType]);

  useEffect(() => {
    if (facilityIds.length > 0) {
      void fetchHistoryPage(0);
      return;
    }
    setHistoryAlerts([]);
    setTotalPages(1);
    setTotalElements(0);
  }, [facilityIds, fetchHistoryPage]);

  useEffect(() => {
    if (dangerAiEvents.length === 0) return;
    setHistoryAlerts((previous) => mergeRealtimeHistory(previous, dangerAiEvents, liveCameras, acknowledgedAiEventIds));
  }, [acknowledgedAiEventIds, dangerAiEvents, liveCameras]);

  const goToPage = useCallback((newPage: number) => {
    if (!isLoading && newPage >= 0 && newPage < totalPages) void fetchHistoryPage(newPage);
  }, [fetchHistoryPage, isLoading, totalPages]);

  return { historyAlerts, isLoadingHistory: isLoading, currentPage: page, totalPages, goToPage, totalHistoryElements: totalElements };
}

function mergeRealtimeHistory(current: readonly IncidentAlert[], events: readonly AiEvent[], liveCameras: readonly LiveCamera[], acknowledgedIds: ReadonlySet<string>): IncidentAlert[] {
  const merged = new Map(current.map((alert) => [alert.id, alert]));
  for (const event of events) {
    const id = aiEventFingerprint(event);
    const presentation = getScenarioPresentation(event.scenarioType!);
    const timestamp = event.capturedAtMs ?? (event.timestamp > 1e10 ? event.timestamp : event.timestamp * 1000);
    const camera = findCameraForAiEvent(liveCameras, event);
    const next: IncidentAlert = {
      id,
      type: event.scenarioType!,
      label: presentation.label,
      timestamp,
      time: new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      camera: camera?.name || camera?.location || event.camera_id || event.camera_login_id || '-',
      severity: presentation.tone,
      status: acknowledgedIds.has(id) ? 'resolved' : 'new',
      clipUrl: event.clipUrl,
      clipPath: event.clipPath,
      sourceEventId: event.eventId,
    };
    const previous = merged.get(id);
    merged.set(id, previous ? {
      ...previous,
      ...next,
      status: previous.status,
      clipUrl: next.clipUrl ?? previous.clipUrl,
      primarySnapshotUrl: previous.primarySnapshotUrl,
      snapshotUrl: previous.snapshotUrl,
      clipPath: next.clipPath ?? previous.clipPath,
    } : next);
  }
  return [...merged.values()].sort((left, right) => right.timestamp - left.timestamp);
}
