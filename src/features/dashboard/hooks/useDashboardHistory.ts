import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IncidentAlert } from '../types/dashboard';
import type { LiveCamera } from '../data/cameras';
import { fetchFullAlertEventsHistory, toIncidentAlertFromRecentEvent } from '../api/alertEventsApi';
import type { HistoryFilters } from '../components/DashboardHistoryView';
import { aiEventFingerprint, getEventTypeKorean, findCameraForAiEvent } from '../../../shared/utils/aiAlerts';

interface UseDashboardHistoryParams {
  facilityIds: (number | string)[];
  liveCameras: readonly LiveCamera[];
  dangerAiEvents: any[];
  acknowledgedAiEventIds: Set<string>;
  filters: HistoryFilters;
  userType: 'individual' | 'corporate';
}

export function useDashboardHistory({
  facilityIds,
  liveCameras,
  dangerAiEvents,
  acknowledgedAiEventIds,
  filters,
  userType,
}: UseDashboardHistoryParams) {
  const [historyAlerts, setHistoryAlerts] = useState<IncidentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  const { searchCamera, searchDate, searchKeyword } = filters;
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchKeyword);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  const fetchHistoryPage = useCallback(async (pageNumber: number) => {
    if (facilityIds.length === 0) return;
    setIsLoading(true);
    try {
      const facilityId = facilityIds[0];

      let dateFrom = undefined;
      const now = new Date();
      if (searchDate === 'today') {
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (searchDate === 'week') {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (searchDate === 'month') {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let cameraId = undefined;
      if (searchCamera && searchCamera !== '전체') {
        // searchCamera is already the cameraDbId string from mappedCamerasForMgmt
        cameraId = searchCamera;
      }

      const keyword = debouncedKeyword?.trim() || undefined;

      const response = await fetchFullAlertEventsHistory(
        facilityId, 
        pageNumber, 
        50, 
        { cameraId, keyword, dateFrom },
        userType
      );
      
      const newAlerts = response.content
        .map((event) => toIncidentAlertFromRecentEvent(event, liveCameras))
        .filter((event): event is IncidentAlert => !!event);

      // numbered pagination: replace list instead of appending
      setHistoryAlerts(newAlerts);
      setPage(response.number);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Failed to fetch full history', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityIds, liveCameras, searchCamera, searchDate, debouncedKeyword, userType]);

  // Initial load or filter change -> go to page 0
  useEffect(() => {
    if (facilityIds.length > 0) {
      void fetchHistoryPage(0);
    } else {
      setHistoryAlerts([]);
      setTotalPages(1);
      setTotalElements(0);
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
          let timestamp = Date.now();
          if (typeof event.timestamp === 'number' && event.timestamp > 0) {
            timestamp = event.timestamp > 1e12 ? event.timestamp : event.timestamp * 1000;
          } else if (typeof event.timestamp === 'string') {
            const parsed = new Date(event.timestamp).getTime();
            if (!isNaN(parsed)) timestamp = parsed;
          }
            
          const cameraObj = findCameraForAiEvent(liveCameras, event);
          const camera = cameraObj?.name || cameraObj?.location || event.camera_id || event.camera_login_id || '알 수 없는 카메라';
          
          let rawType = event.event_type || 'unknown';
          if (rawType.toLowerCase() === 'fall_detected') {
            rawType = 'FALL_BED';
          }
          const type = rawType.toLowerCase();
          const normalizedEventType = rawType.toUpperCase();
          const label = event.message || event.label || event.description || `${normalizedEventType} 감지`;
          
          // Semantic deduplication against DB events (to avoid duplicate from real-time and DB)
          const isDuplicate = updated.some((existing) => 
            existing.camera === camera &&
            existing.type === type &&
            Math.abs(existing.timestamp - timestamp) < 10000
          );

          if (!isDuplicate) {
            updated.unshift({
              id,
              type,
              label,
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

  const goToPage = useCallback((newPage: number) => {
    if (!isLoading && newPage >= 0 && newPage < totalPages) {
      void fetchHistoryPage(newPage);
    }
  }, [isLoading, fetchHistoryPage, totalPages]);

  return {
    historyAlerts,
    isLoadingHistory: isLoading,
    currentPage: page,
    totalPages,
    goToPage,
    totalHistoryElements: totalElements,
  };
}
