import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IncidentAlert } from '../types/dashboard';
import type { LiveCamera } from '../data/cameras';
import { fetchFullAlertEventsHistory, toIncidentAlertFromRecentEvent } from '../api/alertEventsApi';
import type { HistoryFilters } from '../components/DashboardHistoryView';
import { aiEventFingerprint } from '../../../shared/utils/aiAlerts';

interface UseDashboardHistoryParams {
  facilityIds: (number | string)[];
  liveCameras: readonly LiveCamera[];
  dangerAiEvents: any[];
  acknowledgedAiEventIds: Set<string>;
}

export function useDashboardHistory({
  facilityIds,
  liveCameras,
  dangerAiEvents,
  acknowledgedAiEventIds,
}: UseDashboardHistoryParams) {
  const [historyAlerts, setHistoryAlerts] = useState<IncidentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalElements, setTotalElements] = useState<number>(0);

  const fetchHistoryPage = useCallback(async (pageNumber: number, reset: boolean = false) => {
    if (facilityIds.length === 0) return;
    setIsLoading(true);
    try {
      // Fetch for the first facility (assuming individual uses 1, corporate uses companyProfileId)
      const facilityId = facilityIds[0];
      const response = await fetchFullAlertEventsHistory(facilityId, pageNumber, 50);
      
      const newAlerts = response.content
        .map((event) => toIncidentAlertFromRecentEvent(event, liveCameras))
        .filter((event): event is IncidentAlert => !!event);

      setHistoryAlerts((prev) => {
        if (reset) return newAlerts;
        
        // Merge without duplicates
        const merged = new Map(prev.map((a) => [a.id, a]));
        newAlerts.forEach((a) => merged.set(a.id, a));
        
        return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
      });

      setPage(response.number);
      setHasMore(!response.last);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Failed to fetch full history', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityIds, liveCameras]);

  // Initial load
  useEffect(() => {
    if (facilityIds.length > 0) {
      void fetchHistoryPage(0, true);
    } else {
      setHistoryAlerts([]);
      setHasMore(false);
    }
  }, [facilityIds, fetchHistoryPage]);

  // Real-time integration
  useEffect(() => {
    if (dangerAiEvents.length === 0) return;

    setHistoryAlerts((prev) => {
      let updated = [...prev];
      let changed = false;

      // Add new events and handle semantic deduplication
      for (const event of dangerAiEvents) {
        const id = aiEventFingerprint(event);
        if (!prev.find((a) => a.id === id)) {
          const timestamp = typeof event.timestamp === 'number' && event.timestamp > 1e12 
            ? event.timestamp : (event.timestamp || Date.now());
            
          const camera = event.camera || event.camera_name || '알 수 없는 카메라';
          const type = (event.event_type || event.type || 'unknown').toLowerCase();
          
          // Semantic deduplication against DB events (to avoid duplicate from real-time and DB)
          const isDuplicate = prev.some((existing) => 
            existing.camera === camera &&
            existing.type === type &&
            Math.abs(existing.timestamp - timestamp) < 10000
          );

          if (!isDuplicate) {
            updated.unshift({
              id,
              type,
              label: 'AI 실시간 감지',
              timestamp,
              time: new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
              camera,
              severity: 'critical',
              status: acknowledgedAiEventIds.has(id) ? 'resolved' : 'new',
            });
            changed = true;
          }
        }
      }

      // Update resolved status
      updated = updated.map((alert) => {
        if (acknowledgedAiEventIds.has(alert.id) && alert.status === 'new') {
          changed = true;
          return { ...alert, status: 'resolved' as const };
        }
        return alert;
      });

      if (changed) {
        return updated.sort((a, b) => b.timestamp - a.timestamp);
      }
      return prev;
    });
  }, [acknowledgedAiEventIds, dangerAiEvents]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      void fetchHistoryPage(page + 1);
    }
  }, [isLoading, hasMore, fetchHistoryPage, page]);

  const getFilteredHistory = useMemo(
    () => (filters: HistoryFilters) => historyAlerts.filter((alert) => {
      if (
        filters.searchKeyword
        && !alert.label.toLowerCase().includes(filters.searchKeyword.toLowerCase())
        && !alert.camera.includes(filters.searchKeyword)
        && !alert.id.includes(filters.searchKeyword)
      ) {
        return false;
      }

      if (filters.searchCamera && filters.searchCamera !== '전체') {
        const matchedCamera = liveCameras.find(c => c.id === filters.searchCamera);
        if (matchedCamera && alert.camera !== matchedCamera.name && alert.camera !== matchedCamera.location) {
          return false;
        }
      }

      const age = Date.now() - alert.timestamp;
      if (filters.searchDate === 'today' && age > 86400000) return false;
      if (filters.searchDate === 'week' && age > 7 * 86400000) return false;
      if (filters.searchDate === 'month' && age > 30 * 86400000) return false;

      return true;
    }),
    [historyAlerts, liveCameras]
  );

  return {
    historyAlerts,
    getFilteredHistory,
    isLoadingHistory: isLoading,
    hasMoreHistory: hasMore,
    loadMoreHistory: loadMore,
    totalHistoryElements: totalElements,
  };
}
