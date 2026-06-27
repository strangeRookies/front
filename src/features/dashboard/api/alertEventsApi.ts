import { apiRequest } from '../../../shared/api/client';
import type { LiveCamera } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';
import { getEventTypeKorean, getSeverityTone } from '../../../shared/utils/aiAlerts';

export type RecentAlertEventResponse = Record<string, unknown>;

export async function fetchRecentAlertEvents(
  facilityId: number | string,
  userType: 'individual' | 'corporate' = 'individual'
): Promise<RecentAlertEventResponse[]> {
  const url = userType === 'corporate' 
    ? `/api/companies/${facilityId}/alert-events/recent` 
    : `/api/facilities/${facilityId}/alert-events/recent`;
  const data = await apiRequest<unknown>(url, {
    method: 'GET',
  });

  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (isRecord(data) && Array.isArray(data.content)) {
    return data.content.filter(isRecord);
  }

  return [];
}

export interface PaginatedAlertEventsResponse {
  content: RecentAlertEventResponse[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  number: number;
}

export interface AlertEventFilters {
  cameraId?: string | number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchFullAlertEventsHistory(
  facilityId: number | string,
  page: number = 0,
  size: number = 20,
  filters?: AlertEventFilters,
  userType: 'individual' | 'corporate' = 'individual'
): Promise<PaginatedAlertEventsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sort: 'detectedAt,desc',
  });

  if (filters?.cameraId) params.append('cameraId', filters.cameraId.toString());
  if (filters?.keyword) params.append('keyword', filters.keyword);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const url = userType === 'corporate'
    ? `/api/companies/${facilityId}/alert-events?${params.toString()}`
    : `/api/facilities/${facilityId}/alert-events?${params.toString()}`;
  const data = await apiRequest<unknown>(url, {
    method: 'GET',
  });

  if (isRecord(data) && Array.isArray(data.content)) {
    return {
      content: data.content.filter(isRecord),
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 1,
      totalElements: typeof data.totalElements === 'number' ? data.totalElements : data.content.length,
      last: typeof data.last === 'boolean' ? data.last : true,
      number: typeof data.number === 'number' ? data.number : 0,
    };
  }

  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    last: true,
    number: 0,
  };
}

export function toIncidentAlertFromRecentEvent(
  event: RecentAlertEventResponse,
  liveCameras: readonly LiveCamera[],
): IncidentAlert | null {
  const timestamp = readTimestamp(event, ['occurredAt', 'eventTimestamp', 'detectedAt', 'createdAt', 'timestamp']);
  if (!timestamp) {
    return null;
  }

  const eventType = readString(event, ['scenarioType', 'scenario_type', 'eventType', 'event_type', 'type']) || 'UNKNOWN';
  const normalizedEventType = eventType.toUpperCase();
  const cameraKey = readString(event, ['cameraLoginId', 'camera_login_id', 'cameraId', 'camera_id']);
  const cameraName = readString(event, ['cameraName', 'camera_name', 'camera', 'location']);
  const matchedCamera = findLiveCamera(liveCameras, cameraKey, cameraName);

  // 현재 회원의 카메라 목록(liveCameras)에 없는 남의 카메라 이벤트는 필터링(무시)
  if (!matchedCamera) {
    return null;
  }

  const severity = getSeverityTone(readString(event, ['severity', 'level']) || '');
  const statusRaw = readString(event, ['status', 'state'])?.toUpperCase();
  const acknowledged = readBoolean(event, ['acknowledged', 'acknowledgedYn', 'resolved'])
    || statusRaw === 'ACKNOWLEDGED'
    || statusRaw === 'RESOLVED'
    || statusRaw === 'COMPLETED'
    || statusRaw === 'CONFIRMED';

  return {
    id: readString(event, ['eventId', 'event_id', 'alertEventId', 'alert_event_id', 'incidentId', 'id'])
      || `${cameraKey || cameraName || 'unknown'}:${normalizedEventType}:${timestamp}`,
    time: new Date(timestamp).toTimeString().split(' ')[0],
    timestamp,
    camera: matchedCamera?.name || cameraName || cameraKey || '-',
    type: normalizedEventType,
    label: readString(event, ['message', 'label', 'description'])
      || `${normalizedEventType} 감지`,
    severity,
    status: acknowledged ? 'resolved' : 'new',
  };
}

function isRecord(value: unknown): value is RecentAlertEventResponse {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: RecentAlertEventResponse, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function readBoolean(record: RecentAlertEventResponse, keys: string[]) {
  return keys.some((key) => record[key] === true || record[key] === 'true' || record[key] === 'Y');
}

function readTimestamp(record: RecentAlertEventResponse, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 1e12 ? value : value * 1000;
    }
    if (typeof value === 'string' && value.trim()) {
      let dateStr = value.trim();
      // Append Z to treat as UTC if it lacks a timezone offset
      if (/T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr)) {
        dateStr += 'Z';
      }
      const parsed = Date.parse(dateStr);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function findLiveCamera(liveCameras: readonly LiveCamera[], cameraKey?: string, cameraName?: string) {
  const normalizedKeys = new Set([cameraKey, cameraName].map(normalizeCameraToken).filter(Boolean));
  return liveCameras.find((camera) => [
    camera.cameraLoginId,
    camera.cameraDbId,
    camera.id,
    camera.name,
    camera.location,
  ].some((value) => normalizedKeys.has(normalizeCameraToken(value))));
}

function normalizeCameraToken(value?: string) {
  return value?.toLowerCase().replace(/[^a-z0-9가-힣]/g, '') || '';
}

export async function acknowledgeAlertEvent(alertEventId: string | number): Promise<void> {
  await apiRequest(`/api/alert-events/${alertEventId}/acknowledge`, { method: 'PATCH' });
}
