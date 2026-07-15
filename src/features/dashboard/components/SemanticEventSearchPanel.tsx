import { ImageOff, Loader2, Search } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/api/client';
import { getSeverityTone } from '../../../shared/utils/aiAlerts';
import { fetchSemanticAlertEvents, type SemanticSearchResult } from '../api/alertEventsApi';
import {
  DEFAULT_MIN_SIMILARITY,
  DEFAULT_SEMANTIC_TOP_K,
  getSemanticDateRange,
  isValidSemanticSearchScope,
  normalizeSemanticCameraId,
  SemanticSearchContractError,
  type SemanticSearchScope,
} from '../api/semanticSearch';
import { ALL_CAMERAS_VALUE, type IncidentAlert } from '../types/dashboard';

interface SemanticEventSearchPanelProps {
  readonly scope?: SemanticSearchScope;
  readonly cameraId?: string;
  readonly datePeriod: 'today' | 'week' | 'month';
  readonly cameraOptions: readonly { id: string; name: string }[];
  readonly onOpenIncident: (alert: IncidentAlert) => void;
}

export function SemanticEventSearchPanel({
  scope,
  cameraId,
  datePeriod,
  cameraOptions,
  onOpenIncident,
}: SemanticEventSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(new Set());
  const mountedRef = useRef(true);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef<{ key: string; controller: AbortController } | null>(null);
  const scopeAvailable = isValidSemanticSearchScope(scope);

  useEffect(() => () => {
    mountedRef.current = false;
    activeRequestRef.current?.controller.abort();
  }, []);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setMessage('검색어를 입력해 주세요.');
      setResults([]);
      setHasSearched(false);
      return;
    }
    if (!scopeAvailable) {
      setMessage('현재 계정의 AI 영상 검색 범위를 확인할 수 없습니다.');
      setResults([]);
      return;
    }

    const numericCameraId = normalizeSemanticCameraId(cameraId, ALL_CAMERAS_VALUE);
    const dateRange = getSemanticDateRange(datePeriod);
    const requestKey = JSON.stringify([scope.type, scope.id, trimmed, numericCameraId, dateRange.dateFrom, dateRange.dateTo]);
    if (activeRequestRef.current?.key === requestKey) return;

    activeRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    activeRequestRef.current = { key: requestKey, controller };
    setIsLoading(true);
    setMessage('');
    setHasSearched(true);
    setFailedImages(new Set());

    try {
      const data = await fetchSemanticAlertEvents(
        scope,
        trimmed,
        {
          cameraId: numericCameraId,
          ...dateRange,
          topK: DEFAULT_SEMANTIC_TOP_K,
          minSimilarity: DEFAULT_MIN_SIMILARITY,
          excludeMock: import.meta.env.PROD ? true : undefined,
        },
        controller.signal,
      );
      if (mountedRef.current && requestSequenceRef.current === sequence) setResults(data);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (mountedRef.current && requestSequenceRef.current === sequence) {
        setMessage(getSemanticSearchErrorMessage(error));
        setResults([]);
      }
    } finally {
      if (mountedRef.current && requestSequenceRef.current === sequence) {
        setIsLoading(false);
        activeRequestRef.current = null;
      }
    }
  };

  const openResult = (result: SemanticSearchResult) => {
    const timestamp = Date.parse(result.detectedAt);
    const cameraName = cameraOptions.find((camera) => camera.id === String(result.cameraId))?.name
      || result.cameraLoginId;
    onOpenIncident({
      id: String(result.alertEventId),
      time: new Date(timestamp).toTimeString().split(' ')[0],
      timestamp,
      camera: cameraName,
      type: result.scenarioType,
      label: result.vlmDescription || `${result.scenarioType} 감지`,
      severity: getSeverityTone(result.severity),
      status: 'new',
    });
  };

  return (
    <section className="bg-[#071329] border border-slate-800 p-4 rounded-2xl space-y-4" aria-labelledby="semantic-search-title">
      <div>
        <h3 id="semantic-search-title" className="text-sm font-extrabold text-white">AI 사고 영상 검색</h3>
        <p className="text-[11px] text-slate-400 mt-1">
          사고 장면을 자연어로 설명하면 AI가 비식별 처리된 이벤트 미리보기에서 유사한 기록을 찾습니다.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">예: “복도에서 노란 안전모를 쓴 사람이 쓰러짐”, “병실 출입구 주변 배회”</p>
      </div>

      <form className="flex gap-2" onSubmit={handleSearch} role="search">
        <label htmlFor="semantic-event-query" className="sr-only">사고 장면 설명</label>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            id="semantic-event-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="찾으려는 사고 장면을 설명해 주세요"
            aria-describedby="semantic-search-help"
            disabled={!scopeAvailable}
            className="w-full pl-9 pr-4 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !scopeAvailable}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#071329]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : '검색'}
          <span className="sr-only">{isLoading ? '검색 중' : ''}</span>
        </button>
      </form>
      <p id="semantic-search-help" className="sr-only">Enter 키 또는 검색 버튼으로 검색합니다.</p>

      <div aria-live="polite" aria-atomic="true">
        {!scopeAvailable && <p className="text-[11px] text-amber-400">현재 계정에서는 AI 영상 검색을 사용할 수 없습니다.</p>}
        {isLoading && <p className="text-[11px] text-slate-400">AI가 유사한 사고 영상을 검색하고 있습니다.</p>}
        {message && <p className="text-[11px] text-rose-400" role="alert">{message}</p>}
        {!isLoading && hasSearched && results.length === 0 && !message && (
          <p className="text-[11px] text-slate-500">조건에 맞는 유사 사고 영상이 없습니다.</p>
        )}
        {!isLoading && results.length > 0 && (
          <p className="text-[10px] text-slate-400">유사 사고 영상 {results.length}건을 찾았습니다.</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            const cameraName = cameraOptions.find((camera) => camera.id === String(result.cameraId))?.name;
            const visibleKeyframes = result.keyframeUrls.filter((url) => !failedImages.has(url));
            return (
              <button
                type="button"
                key={result.alertEventId}
                onClick={() => openResult(result)}
                className="block w-full text-left border border-slate-800 rounded-xl p-3 bg-[#020817] hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`${result.vlmDescription || result.scenarioType} 사고 상세 열기`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">{result.vlmDescription || '설명 없는 사고 이벤트'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      카메라: {cameraName ? `${cameraName} (${result.cameraLoginId})` : result.cameraLoginId}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      유형: {result.scenarioType} · 심각도: {result.severity} · 유사도: {(result.similarityScore * 100).toFixed(0)}%
                    </p>
                  </div>
                  <time className="text-[10px] text-slate-400" dateTime={result.detectedAt}>
                    {new Date(result.detectedAt).toLocaleString('ko-KR')}
                  </time>
                </div>
                {visibleKeyframes.length > 0 ? (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {visibleKeyframes.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="비식별 처리된 사고 미리보기"
                        onError={() => setFailedImages((current) => new Set(current).add(url))}
                        className="h-16 w-24 object-cover rounded-lg border border-slate-800"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex h-16 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-800 text-[10px] text-slate-500">
                    <ImageOff className="h-4 w-4" aria-hidden="true" />
                    비식별 미리보기가 없습니다.
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getSemanticSearchErrorMessage(error: unknown): string {
  if (error instanceof SemanticSearchContractError) {
    return 'AI 영상 검색 서버가 아직 준비되지 않았거나 응답 형식이 올바르지 않습니다.';
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    if (error.status === 403) return 'AI 영상 검색 권한이 없습니다.';
    if (error.status === 404 || error.status === 501) return 'AI 영상 검색 기능이 아직 서버에 준비되지 않았습니다.';
    if (error.status >= 500) return '서버 오류로 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '검색 요청에 실패했습니다. 네트워크 연결을 확인해 주세요.';
}
