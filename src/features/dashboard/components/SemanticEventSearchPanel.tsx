import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { fetchSemanticAlertEvents, type SemanticSearchResult } from '../api/alertEventsApi';

interface SemanticEventSearchPanelProps {
  readonly facilityId?: number | string;
  readonly userType: 'individual' | 'corporate';
  readonly cameraId?: string;
}

export function SemanticEventSearchPanel({
  facilityId,
  userType,
  cameraId,
}: SemanticEventSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!facilityId || !trimmed) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const data = await fetchSemanticAlertEvents(
        facilityId,
        trimmed,
        {
          cameraId: cameraId && cameraId !== '?꾩껜' ? cameraId : undefined,
          dateFrom,
          topK: 10,
          minSimilarity: 0.1,
        },
        userType
      );
      setResults(data);
    } catch (error) {
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
          <p className="text-[10px] text-slate-500 mt-1">Description + embedding search over processed event media.</p>
        </div>
        <span className="text-[10px] text-slate-500">de-identified previews only</span>
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
            placeholder="yellow helmet worker collapsed near hallway"
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
      {errorMessage && <p className="text-[10px] text-rose-400">{errorMessage}</p>}
      {!isLoading && results.length === 0 && query.trim() && !errorMessage && (
        <p className="text-[10px] text-slate-500">No semantic matches yet.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <article key={result.alertEventId} className="border border-slate-800 rounded-xl p-3 bg-[#020817]">
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
              {result.keyframeUrls.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {result.keyframeUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="De-identified event keyframe"
                      className="h-16 w-24 object-cover rounded-lg border border-slate-800"
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
