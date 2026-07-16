export const DEFAULT_SEMANTIC_TOP_K = 10;
export const DEFAULT_MIN_SIMILARITY = 0.1;

export type SemanticSearchScope =
  | { readonly type: 'facility'; readonly id: number | string }
  | { readonly type: 'company'; readonly id: number | string };

export interface SemanticSearchQueryFilters {
  readonly cameraId?: number;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly topK?: number;
  readonly minSimilarity?: number;
  readonly excludeMock?: boolean;
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
  readonly snapshotUrl?: string;
}

export class SemanticSearchContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemanticSearchContractError';
  }
}

export function isValidSemanticSearchScope(scope: SemanticSearchScope | undefined): scope is SemanticSearchScope {
  if (!scope || (scope.type !== 'facility' && scope.type !== 'company')) return false;
  if (typeof scope.id === 'number') return Number.isSafeInteger(scope.id) && scope.id > 0;
  return /^\d+$/.test(scope.id.trim()) && Number(scope.id) > 0;
}

export function normalizeSemanticCameraId(value: string | number | undefined, allCameraValue: string): number | undefined {
  if (value === undefined || value === '' || value === allCameraValue) return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : undefined;
}

export function getSemanticDateRange(period: 'today' | 'week' | 'month', now = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  return {
    dateFrom: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: now.toISOString(),
  };
}

export function buildSemanticSearchPath(
  scope: SemanticSearchScope,
  query: string,
  filters: SemanticSearchQueryFilters = {},
): string {
  if (!isValidSemanticSearchScope(scope)) {
    throw new SemanticSearchContractError('검색 범위 식별자가 올바르지 않습니다.');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) throw new SemanticSearchContractError('검색어를 입력해 주세요.');

  const topK = filters.topK ?? DEFAULT_SEMANTIC_TOP_K;
  const minSimilarity = filters.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  if (!Number.isInteger(topK) || topK < 1 || topK > 50) {
    throw new SemanticSearchContractError('topK는 1에서 50 사이여야 합니다.');
  }
  if (!Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) {
    throw new SemanticSearchContractError('최소 유사도는 0에서 1 사이여야 합니다.');
  }
  if (filters.cameraId !== undefined && (!Number.isSafeInteger(filters.cameraId) || filters.cameraId <= 0)) {
    throw new SemanticSearchContractError('카메라 DB 식별자가 올바르지 않습니다.');
  }

  const params = new URLSearchParams({
    query: trimmedQuery,
    topK: String(topK),
    minSimilarity: String(minSimilarity),
    excludeMock: String(filters.excludeMock ?? false),
  });
  appendIsoDate(params, 'dateFrom', filters.dateFrom);
  appendIsoDate(params, 'dateTo', filters.dateTo);
  if (filters.cameraId !== undefined) params.set('cameraId', String(filters.cameraId));

  const resource = scope.type === 'company' ? 'companies' : 'facilities';
  return `/api/${resource}/${encodeURIComponent(String(scope.id).trim())}/search/semantic?${params.toString()}`;
}

export function parseSemanticSearchResponse(value: unknown): SemanticSearchResult[] {
  if (!Array.isArray(value)) {
    throw new SemanticSearchContractError('서버의 의미 검색 응답 형식이 올바르지 않습니다.');
  }
  return value.filter(isSemanticSearchResult);
}

export function isAllowedSemanticPreviewUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function filterSemanticMockResults(
  candidates: readonly SemanticSearchResult[],
  query: string,
  filters: SemanticSearchQueryFilters = {},
): SemanticSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const minSimilarity = filters.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const topK = filters.topK ?? DEFAULT_SEMANTIC_TOP_K;
  const seen = new Set<number>();

  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.alertEventId)) return false;
      seen.add(candidate.alertEventId);
      const timestamp = Date.parse(candidate.detectedAt);
      return (filters.cameraId === undefined || candidate.cameraId === filters.cameraId)
        && (!filters.dateFrom || timestamp >= Date.parse(filters.dateFrom))
        && (!filters.dateTo || timestamp <= Date.parse(filters.dateTo));
    })
    .map((candidate) => {
      const haystack = `${candidate.vlmDescription} ${candidate.cameraLoginId} ${candidate.scenarioType} ${candidate.severity}`.toLocaleLowerCase('ko-KR');
      const matches = tokens.filter((token) => haystack.includes(token)).length;
      const lexicalScore = matches > 0 ? 0.55 + 0.4 * (matches / tokens.length) : 0;
      const stableTieBreaker = stableHash(`${normalizedQuery}:${candidate.alertEventId}`) % 40 / 1000;
      return { ...candidate, similarityScore: Math.min(0.99, lexicalScore + stableTieBreaker) };
    })
    .filter((candidate) => candidate.similarityScore >= minSimilarity)
    .sort((left, right) => right.similarityScore - left.similarityScore || left.alertEventId - right.alertEventId)
    .slice(0, topK);
}

function appendIsoDate(params: URLSearchParams, key: 'dateFrom' | 'dateTo', value: string | undefined) {
  if (value === undefined) return;
  if (!value.trim() || !Number.isFinite(Date.parse(value))) {
    throw new SemanticSearchContractError(`${key} 날짜가 올바르지 않습니다.`);
  }
  params.set(key, new Date(value).toISOString());
}

function isSemanticSearchResult(value: unknown): value is SemanticSearchResult {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.alertEventId) && (value.alertEventId as number) > 0
    && Number.isSafeInteger(value.cameraId) && (value.cameraId as number) > 0
    && isNonEmptyString(value.cameraLoginId)
    && isNonEmptyString(value.scenarioType)
    && isNonEmptyString(value.severity)
    && isNonEmptyString(value.detectedAt) && Number.isFinite(Date.parse(value.detectedAt as string))
    && typeof value.vlmDescription === 'string'
    && typeof value.vlmJson === 'string'
    && typeof value.similarityScore === 'number'
    && Number.isFinite(value.similarityScore)
    && value.similarityScore >= 0
    && value.similarityScore <= 1
    && Array.isArray(value.keyframeUrls)
    && value.keyframeUrls.every(isAllowedSemanticPreviewUrl)
    && (value.snapshotUrl === undefined || value.snapshotUrl === null || isAllowedSemanticPreviewUrl(value.snapshotUrl));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
