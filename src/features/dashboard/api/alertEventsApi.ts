import { apiRequest } from '../../../shared/api/client';
import { getScenarioPresentation } from '../../../shared/utils/aiAlerts';
import { AI_SCENARIO_TYPES, type AiScenarioType } from '../../../shared/utils/aiEventTypes';
import type { LiveCamera } from '../data/cameras';
import mockVlmIncidents from '../data/mockVlmIncidents.json';
import type { IncidentAlert } from '../types/dashboard';

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

export interface SemanticSearchFilters {
  cameraId?: string | number;
  dateFrom?: string;
  dateTo?: string;
  topK?: number;
  minSimilarity?: number;
  excludeMock?: boolean;
}

export interface SemanticSearchResult {
  readonly alertEventId: number;
  readonly cameraId: number;
  readonly cameraLoginId: string;
  readonly scenarioType: string;
  readonly severity: string;
  readonly detectedAt: string;
  readonly vlmDescription: string;
  readonly vlmJson: string;
  readonly similarityScore: number;
  readonly keyframeUrls: readonly string[];
}

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
  facilityId: number | string,
  query: string,
  filters: SemanticSearchFilters = {},
  userType: 'individual' | 'corporate' = 'individual',
): Promise<SemanticSearchResult[]> {
  if (import.meta.env.VITE_VLM_MOCK_SEARCH === 'true') {
    return readMockSemanticResults(query, filters);
  }

  const params = new URLSearchParams({
    query,
    topK: String(filters.topK ?? 10),
    minSimilarity: String(filters.minSimilarity ?? 0.1),
    excludeMock: String(filters.excludeMock ?? import.meta.env.PROD),
  });
  if (filters.cameraId) params.append('cameraId', String(filters.cameraId));
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  const url = userType === 'corporate'
    ? `/api/companies/${facilityId}/search/semantic?${params.toString()}`
    : `/api/facilities/${facilityId}/search/semantic?${params.toString()}`;
  const data = await apiRequest<unknown>(url, { method: 'GET' });
  return Array.isArray(data) ? data.filter(isSemanticSearchResult) : [];
}

interface MockVlmIncidentResult {
  readonly incidentId: string;
  readonly cameraLoginId: string;
  readonly status: string;
  readonly detectedAt: string;
  readonly timeline: readonly string[];
  readonly summary: string;
  readonly similarityScore: number;
}

function readMockSemanticResults(_query: string, filters: SemanticSearchFilters): SemanticSearchResult[] {
  if (!isRecord(mockVlmIncidents) || !Array.isArray(mockVlmIncidents.results)) {
    return [];
  }

  return mockVlmIncidents.results
    .filter(isMockVlmIncidentResult)
    .filter((result) => matchesMockSemanticFilters(result, filters))
    .slice(0, Math.max(1, filters.topK ?? 10))
    .map((result, index) => ({
      alertEventId: stablePositiveId(result.incidentId),
      cameraId: stablePositiveId(result.cameraLoginId),
      cameraLoginId: result.cameraLoginId,
      scenarioType: result.timeline[0] ?? 'NORMAL',
      severity: result.status,
      detectedAt: result.detectedAt,
      vlmDescription: result.summary,
      vlmJson: JSON.stringify(result),
      similarityScore: result.similarityScore,
      keyframeUrls: [],
    }))
    .filter((result, index, results) =>
      results.findIndex((candidate) => candidate.alertEventId === result.alertEventId) === index
    );
}

function matchesMockSemanticFilters(
  result: MockVlmIncidentResult,
  filters: SemanticSearchFilters,
) {
  const cameraMatches = !filters.cameraId || normalizeCameraToken(String(filters.cameraId)) === normalizeCameraToken(result.cameraLoginId);
  const fromMatches = !filters.dateFrom || result.detectedAt >= filters.dateFrom;
  const toMatches = !filters.dateTo || result.detectedAt <= filters.dateTo;
  const similarityMatches = result.similarityScore >= (filters.minSimilarity ?? 0);
  return cameraMatches && fromMatches && toMatches && similarityMatches;
}

function isMockVlmIncidentResult(value: unknown): value is MockVlmIncidentResult {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.incidentId === 'string'
    && typeof value.cameraLoginId === 'string'
    && typeof value.status === 'string'
    && typeof value.detectedAt === 'string'
    && Array.isArray(value.timeline)
    && value.timeline.every((eventType) => typeof eventType === 'string')
    && typeof value.summary === 'string'
    && typeof value.similarityScore === 'number';
}

function stablePositiveId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return hash >>> 0;
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
  if (!matchedCamera) return null;
  const status = readString(event, ['status', 'state']).toUpperCase();
  const acknowledged = readBoolean(event, ['acknowledged', 'acknowledgedYn', 'resolved']) || ['ACKNOWLEDGED', 'RESOLVED', 'COMPLETED', 'CONFIRMED'].includes(status);
  const presentation = getScenarioPresentation(scenarioType);
  const snapshotUrl = readString(event, ['snapshotUrl', 'snapshot_url']) || undefined;
  const clipUrl = readString(event, ['clipUrl', 'clip_url']) || (snapshotUrl?.includes('.mp4') || snapshotUrl?.includes('/clips/') ? snapshotUrl : undefined);
  return {
    id: readString(event, ['eventId', 'event_id', 'alertEventId', 'alert_event_id', 'incidentId', 'id']) || `${cameraKey || cameraName || 'unknown'}:${scenarioType}:${timestamp}`,
    time: new Date(timestamp).toTimeString().split(' ')[0],
    timestamp,
    camera: matchedCamera.name || cameraName || cameraKey || '-',
    type: scenarioType,
    label: presentation.label,
    severity: presentation.tone,
    status: acknowledged ? 'resolved' : 'new',
    snapshotUrl,
    clipUrl,
    clipPath: readString(event, ['clipPath', 'clip_path']) || undefined,
  };
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

function isSemanticSearchResult(value: unknown): value is SemanticSearchResult {
  return isRecord(value)
    && typeof value.alertEventId === 'number'
    && typeof value.cameraId === 'number'
    && typeof value.cameraLoginId === 'string'
    && typeof value.scenarioType === 'string'
    && typeof value.severity === 'string'
    && typeof value.detectedAt === 'string'
    && typeof value.vlmDescription === 'string'
    && typeof value.vlmJson === 'string'
    && typeof value.similarityScore === 'number'
    && Array.isArray(value.keyframeUrls)
    && value.keyframeUrls.every((url) => typeof url === 'string');
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
