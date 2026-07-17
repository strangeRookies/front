import { ApiError, apiRequest } from '../../../shared/api/client';
import { getScenarioPresentation } from '../../../shared/utils/aiAlerts';
import { AI_SCENARIO_TYPES, type AiScenarioType } from '../../../shared/utils/aiEventTypes';
import type { LiveCamera } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';
import {
  buildSemanticSearchPath,
  filterSemanticMockResults,
  parseSemanticSearchResponse,
  type SemanticSearchQueryFilters,
  type SemanticSearchResult,
  type SemanticSearchScope,
} from './semanticSearch';

export type { SemanticSearchResult, SemanticSearchScope } from './semanticSearch';

export type RecentAlertEventResponse = Record<string, unknown>;

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

export type SemanticSearchFilters = SemanticSearchQueryFilters;

export async function fetchRecentAlertEvents(facilityId: number | string, userType: 'individual' | 'corporate' = 'individual'): Promise<RecentAlertEventResponse[]> {
  const url = userType === 'corporate'
    ? `/api/companies/${facilityId}/alert-events/recent`
    : `/api/facilities/${facilityId}/alert-events/recent`;
  const data = await apiRequest<unknown>(url, { method: 'GET' });
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data) && Array.isArray(data.content)) return data.content.filter(isRecord);
  return [];
}

export async function fetchFullAlertEventsHistory(
  facilityId: number | string,
  page = 0,
  size = 20,
  filters?: AlertEventFilters,
  userType: 'individual' | 'corporate' = 'individual',
): Promise<PaginatedAlertEventsResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'detectedAt,desc' });
  if (filters?.cameraId) params.append('cameraId', String(filters.cameraId));
  if (filters?.keyword) params.append('keyword', filters.keyword);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  const url = userType === 'corporate'
    ? `/api/companies/${facilityId}/alert-events?${params.toString()}`
    : `/api/facilities/${facilityId}/alert-events?${params.toString()}`;
  const data = await apiRequest<unknown>(url, { method: 'GET' });
  if (isRecord(data) && Array.isArray(data.content)) {
    const pageData = isRecord(data.page) ? data.page : data;
    return {
      content: data.content.filter(isRecord),
      totalPages: numberValue(pageData.totalPages ?? data.totalPages, 1),
      totalElements: numberValue(pageData.totalElements ?? data.totalElements, data.content.length),
      last: typeof data.last === 'boolean' ? data.last : true,
      number: numberValue(pageData.number ?? data.number, 0),
    };
  }
  return { content: [], totalPages: 0, totalElements: 0, last: true, number: 0 };
}

export async function fetchSemanticAlertEvents(
  scope: SemanticSearchScope,
  query: string,
  filters: SemanticSearchFilters = {},
  signal?: AbortSignal,
): Promise<SemanticSearchResult[]> {
  const effectiveFilters = {
    ...filters,
    excludeMock: filters.excludeMock ?? true,
  };

  if (import.meta.env.DEV && import.meta.env.VITE_VLM_MOCK_SEARCH === 'true') {
    return filterSemanticMockResults(createSemanticMockCandidates(), query, effectiveFilters);
  }

  const url = buildSemanticSearchPath(scope, query, effectiveFilters);
  const data = await apiRequest<unknown>(url, { method: 'GET', signal });
  return parseSemanticSearchResponse(data);
}

export function toIncidentAlertFromRecentEvent(
  event: RecentAlertEventResponse,
  liveCameras: readonly LiveCamera[],
): IncidentAlert | null {
  const timestamp = readTimestamp(event, ['occurredAt', 'eventTimestamp', 'detectedAt', 'createdAt', 'timestamp']);
  const scenarioType = readString(event, ['scenarioType', 'scenario_type']).toUpperCase();
  if (!timestamp || !isAiScenarioType(scenarioType)) return null;
  const cameraKey = readString(event, ['cameraLoginId', 'camera_login_id', 'cameraId', 'camera_id']);
  const cameraName = readString(event, ['cameraName', 'camera_name', 'camera', 'location']);
  const matchedCamera = findLiveCamera(liveCameras, cameraKey, cameraName);
  const status = readString(event, ['status', 'state']).toUpperCase();
  const acknowledged = readBoolean(event, ['acknowledged', 'acknowledgedYn', 'resolved']) || ['ACKNOWLEDGED', 'RESOLVED', 'COMPLETED', 'CONFIRMED'].includes(status);
  const presentation = getScenarioPresentation(scenarioType);
  const snapshotUrl = readString(event, ['snapshotUrl', 'snapshot_url']) || undefined;
  // Map snapshotUrl to both snapshotUrl (compat) and primarySnapshotUrl (representative JPEG).
  // Never promote mp4/clips into clipUrl.
  const clipUrl = readString(event, ['clipUrl', 'clip_url']) || undefined;
  const alertEventId = readNumber(event, ['alertEventId', 'alert_event_id']);
  const eventIdString = readString(event, ['eventId', 'event_id', 'incidentId']);
  const originalEventIdString = readString(event, ['originalEventId', 'original_event_id', 'sourceEventId', 'source_event_id']);
  // Prefer originalEventId for stable incident family when present (legacy dual-id case)
  const sourceEventId = originalEventIdString || eventIdString || undefined;
  return {
    id: alertEventId != null ? String(alertEventId) : (eventIdString || `${cameraKey || cameraName || 'unknown'}:${scenarioType}:${timestamp}`),
    time: new Date(timestamp).toTimeString().split(' ')[0],
    timestamp,
    camera: matchedCamera?.name || cameraName || cameraKey || '-',
    type: scenarioType,
    label: presentation.label,
    severity: presentation.tone,
    status: acknowledged ? 'resolved' : 'new',
    snapshotUrl,
    primarySnapshotUrl: snapshotUrl,
    clipUrl,
    clipPath: readString(event, ['clipPath', 'clip_path']) || undefined,
    sourceEventId,
  };
}
export async function fetchAlertEventDetail(alertEventId: number): Promise<{ vlmDescription: string | null }> {
  const data = await apiRequest<unknown>(`/api/alert-events/${alertEventId}`, { method: 'GET' });
  if (!isRecord(data)) {
    return { vlmDescription: null };
  }
  const text = data.vlmDescription;
  return {
    vlmDescription: typeof text === 'string' && text.trim().length > 0 ? text.trim() : null,
  };
}

export async function fetchVlmSnapshotAssist(eventId: string): Promise<import('../types/vlmSnapshotAssist').VlmSnapshotAssistResult | null> {
  try {
    const data = await apiRequest<unknown>(`/api/vlm/snapshot-assist/${encodeURIComponent(eventId)}`, { method: 'GET' });
    return isVlmSnapshotAssistResult(data) ? data : null;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      console.debug('[fetchVlmSnapshotAssist] suppressed', error.status);
      return null;
    }
    if (error instanceof ApiError) {
      console.warn('[fetchVlmSnapshotAssist] error', error.status);
    }
    return null;
  }
}

export async function acknowledgeAlertEvent(alertEventId: string | number): Promise<void> {
  await apiRequest(`/api/alert-events/${alertEventId}/acknowledge`, { method: 'PATCH' });
}

function isAiScenarioType(value: string): value is AiScenarioType {
  return (AI_SCENARIO_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is RecentAlertEventResponse {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function createSemanticMockCandidates(now = Date.now()): SemanticSearchResult[] {
  const detectedAt = (hoursAgo: number) => new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
  return [
    {
      alertEventId: 900001,
      cameraId: 1,
      cameraLoginId: 'mock-hallway-01',
      scenarioType: 'FALL_DETECTED',
      severity: 'HIGH',
      detectedAt: detectedAt(2),
      vlmDescription: '복도에서 노란 안전모를 쓴 작업자가 쓰러진 상황',
      vlmJson: '{}',
      similarityScore: 0,
      keyframeUrls: [],
    },
    {
      alertEventId: 900002,
      cameraId: 2,
      cameraLoginId: 'mock-ward-02',
      scenarioType: 'WANDERING',
      severity: 'WARNING',
      detectedAt: detectedAt(26),
      vlmDescription: '병실 출입구 주변을 반복해서 배회하는 사람',
      vlmJson: '{}',
      similarityScore: 0,
      keyframeUrls: [],
    },
    {
      alertEventId: 900003,
      cameraId: 3,
      cameraLoginId: 'mock-lobby-03',
      scenarioType: 'INTRUSION',
      severity: 'INFO',
      detectedAt: detectedAt(120),
      vlmDescription: '로비 제한 구역에 진입한 방문자',
      vlmJson: '{}',
      similarityScore: 0,
      keyframeUrls: [],
    },
  ];
}

function isVlmSnapshotAssistResult(value: unknown): value is import('../types/vlmSnapshotAssist').VlmSnapshotAssistResult {
  if (!isRecord(value)) return false;
  return typeof value.eventId === 'string'
    && typeof value.cameraLoginId === 'string'
    && ['PENDING', 'SUCCESS', 'FAILED'].includes(String(value.status))
    && typeof value.summaryKo === 'string'
    && typeof value.errorMessage === 'string'
    && typeof value.updatedAt === 'string';
}

function readString(record: RecentAlertEventResponse, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readBoolean(record: RecentAlertEventResponse, keys: readonly string[]): boolean {
  return keys.some((key) => record[key] === true || record[key] === 'true' || record[key] === 'Y');
}

function readTimestamp(record: RecentAlertEventResponse, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
    if (typeof value === 'string' && value.trim()) {
      const source = value.trim();
      const dateString = /T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(source) ? `${source}Z` : source;
      const parsed = Date.parse(dateString);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readNumber(record: RecentAlertEventResponse, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  }
  return null;
}
function numberValue(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function findLiveCamera(liveCameras: readonly LiveCamera[], cameraKey?: string, cameraName?: string) {
  const normalizedKeys = new Set([cameraKey, cameraName].map(normalizeCameraToken).filter(Boolean));
  return liveCameras.find((camera) => [camera.cameraLoginId, camera.cameraDbId, camera.id, camera.name, camera.location].some((value) => normalizedKeys.has(normalizeCameraToken(value))));
}

function normalizeCameraToken(value?: string): string {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}
