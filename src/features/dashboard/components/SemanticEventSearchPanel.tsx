import { Loader2, Search, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchSemanticAlertEvents, fetchAlertEventDetail, type SemanticSearchResult } from '../api/alertEventsApi';
import type { IncidentAlert } from '../types/dashboard';


/** Feature flag: hide panel entirely when VLM search is off (default). */
export function isVlmSearchUiEnabled(): boolean {
  const raw = String(import.meta.env.VITE_VLM_ENABLED ?? import.meta.env.VITE_VLM_SEARCH_ENABLED ?? 'false')
    .toLowerCase()
    .trim();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

interface SemanticEventSearchPanelProps {
  readonly facilityId?: number | string;
  readonly userType: 'individual' | 'corporate';
  readonly cameraId?: string;
  /** Optional clip playback URL from history selection */
  readonly selectedClipUrl?: string | null;
  readonly historyAlerts?: readonly IncidentAlert[];
}

export function SemanticEventSearchPanel({
  facilityId,
  userType,
  cameraId,
  selectedClipUrl,
  historyAlerts,
}: SemanticEventSearchPanelProps) {
  const enabled = useMemo(() => isVlmSearchUiEnabled(), []);
  const [query, setQuery] = useState('');
  const [eventType, setEventType] = useState('');
  const [vlmStatus, setVlmStatus] = useState('');
  const [dateFrom, setDateFrom] = useState(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [results, setResults] = useState<readonly SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [activeClipUrl, setActiveClipUrl] = useState<string | null>(null);
  const [activeEventLabel, setActiveEventLabel] = useState<string | null>(null);

  if (!enabled) {
    return null;
  }

  const handleSelectResult = async (result: SemanticSearchResult) => {
    setErrorMessage('');
    // 1. Try finding in historyAlerts first
    const matched = historyAlerts?.find(
      (alert) => String(alert.id) === String(result.alertEventId)
    );
    if (matched) {
      const url = matched.clipUrl || (matched.snapshotUrl && (/\.(mp4|mov|avi|webm)(\?|$)/i.test(matched.snapshotUrl) || /\/clips\//i.test(matched.snapshotUrl)) ? matched.snapshotUrl : null);
      if (url) {
        setActiveClipUrl(url);
        setActiveEventLabel(result.vlmDescription);
        return;
      }
    }

    // 2. Otherwise fetch details from API
    try {
      setIsLoading(true);
      const detail = await fetchAlertEventDetail(result.alertEventId);
      const clipUrl = (detail.clipUrl as string) || '';
      const snapshotUrl = (detail.snapshotUrl as string) || '';
      const resolved = clipUrl.trim() || (snapshotUrl && (/\.(mp4|mov|avi|webm)(\?|$)/i.test(snapshotUrl) || /\/clips\//i.test(snapshotUrl)) ? snapshotUrl : '');
      if (resolved) {
        setActiveClipUrl(resolved);
        setActiveEventLabel(result.vlmDescription);
      } else {
        setErrorMessage('This event does not have a clip URL.');
      }
    } catch (err) {
      setErrorMessage('Failed to fetch clip URL for this event.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!facilityId || !trimmed) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchSemanticAlertEvents(
        facilityId,
        trimmed,
        {
          cameraId: cameraId && cameraId !== '전체' ? cameraId : undefined,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          topK: 10,
          minSimilarity: 0.1,
        },
        userType
      );
      // Client-side filter for eventType / VLM status when API has no dedicated field
      const filtered = data.filter((row) => {
        if (eventType && !String(row.scenarioType || '').toLowerCase().includes(eventType.toLowerCase())) {
          return false;
        }
        if (vlmStatus) {
          const hay = `${row.vlmDescription || ''} ${row.severity || ''}`.toLowerCase();
          if (!hay.includes(vlmStatus.toLowerCase())) {
            return false;
          }
        }
        return true;
      });
      setResults(filtered);
      setActiveClipUrl(null);
      setActiveEventLabel(null);
    } catch (error) {
      // 404 / network: keep dashboard usable — empty results + soft error
      setErrorMessage(error instanceof Error ? error.message : 'Semantic search failed.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-[#071329] border border-slate-800 p-4 rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-extrabold text-white">VLM semantic search</h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Mock/offline search over processed event descriptions (feature-flagged).
          </p>
        </div>
        <span className="text-[10px] text-slate-500">VITE_VLM_ENABLED</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] text-slate-400">Date from</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-slate-400">Event type</span>
          <input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="FALL / FAINT"
            className="w-full px-2 py-1.5 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-slate-400">VLM status</span>
          <input
            value={vlmStatus}
            onChange={(e) => setVlmStatus(e.target.value)}
            placeholder="SUCCESS / mock"
            className="w-full px-2 py-1.5 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSearch();
            }}
            placeholder="자연어: 복도에서 쓰러진 작업자"
            className="w-full pl-9 pr-4 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
          />
        </div>
        <button
          onClick={() => void handleSearch()}
          disabled={isLoading || !facilityId}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-[10px]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>
      {cameraId && cameraId !== '전체' && (
        <p className="text-[10px] text-slate-500">Camera filter: {cameraId}</p>
      )}
      {errorMessage && <p className="text-[10px] text-rose-400">{errorMessage}</p>}
      {!isLoading && results.length === 0 && query.trim() && !errorMessage && (
        <p className="text-[10px] text-slate-500">No semantic matches yet.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <article
              key={result.alertEventId}
              onClick={() => void handleSelectResult(result)}
              className="border border-slate-800 rounded-xl p-3 bg-[#020817] cursor-pointer hover:border-blue-500 hover:bg-slate-900/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">{result.vlmDescription}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {result.cameraLoginId} / {result.scenarioType} / {(result.similarityScore * 100).toFixed(0)}%
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(result.detectedAt).toLocaleString('ko-KR')}
                </span>
              </div>
              {result.keyframeUrls && result.keyframeUrls.length > 0 ? (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {result.keyframeUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Event keyframe"
                      className="h-16 w-24 object-cover rounded-lg border border-slate-800"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-600 mt-2">No keyframe preview</p>
              )}
            </article>
          ))}
        </div>
      )}
      {(activeClipUrl || selectedClipUrl) ? (
        <div className="border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-blue-500" />
              {activeClipUrl ? `Selected event clip: ${activeEventLabel}` : 'Existing clip playback'}
            </span>
            {activeClipUrl && (
              <button
                onClick={() => {
                  setActiveClipUrl(null);
                  setActiveEventLabel(null);
                }}
                className="text-blue-500 hover:text-blue-400 font-bold"
              >
                Reset to default
              </button>
            )}
          </div>
          <video
            key={activeClipUrl || selectedClipUrl || ''}
            src={activeClipUrl || selectedClipUrl || undefined}
            controls
            className="w-full max-h-48 rounded-lg bg-black"
          />
        </div>
      ) : null}

    </section>
  );
}
