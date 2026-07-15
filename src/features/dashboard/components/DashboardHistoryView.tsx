import { Search, Video } from 'lucide-react';
import { ALL_CAMERAS_VALUE, type IncidentAlert } from '../types/dashboard';
import { SemanticEventSearchPanel } from './SemanticEventSearchPanel';
import type { SemanticSearchScope } from '../api/semanticSearch';

export interface HistoryFilters {
  searchCamera: string;
  searchDate: 'today' | 'week' | 'month';
  searchKeyword: string;
}

interface DashboardHistoryViewProps {
  historyAlerts: readonly IncidentAlert[];
  searchCamera: string;
  searchDate: 'today' | 'week' | 'month';
  searchKeyword: string;
  cameraOptions: readonly { id: string; name: string }[];
  totalHistoryElements: number;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  onOpenIncident: (alert: IncidentAlert) => void;
  onSearchCameraChange: (value: string) => void;
  onSearchDateChange: (value: 'today' | 'week' | 'month') => void;
  onSearchKeywordChange: (value: string) => void;
  semanticSearchScope?: SemanticSearchScope;
}

export function DashboardHistoryView({
  historyAlerts,
  searchCamera,
  searchDate,
  searchKeyword,
  cameraOptions,
  totalHistoryElements,
  isLoading = false,
  currentPage,
  totalPages,
  onGoToPage,
  onOpenIncident,
  onSearchCameraChange,
  onSearchDateChange,
  onSearchKeywordChange,
  semanticSearchScope,
}: DashboardHistoryViewProps) {
  const displayCount = totalHistoryElements;

  // Pagination logic to display fixed blocks of 5 page buttons (e.g., 1~5, 6~10)
  const currentChunk = Math.floor(currentPage / 5);
  const startPage = currentChunk * 5;
  const endPage = Math.min(totalPages, startPage + 5);
  const visiblePages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl flex flex-col">
      <div>
        <h2 className="text-base font-extrabold text-white">이벤트 기록</h2>
        <p className="text-xs text-slate-400 mt-1">
          실제 수신된 이벤트 기록을 기간, 카메라, 키워드로 조회합니다.
        </p>
      </div>
      <SemanticEventSearchPanel
        scope={semanticSearchScope}
        cameraId={searchCamera}
        datePeriod={searchDate}
        cameraOptions={cameraOptions}
        onOpenIncident={onOpenIncident}
      />
      <div className="bg-[#071329] border border-slate-800 p-4 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">기간</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'today', label: '오늘' },
                { id: 'week', label: '7일' },
                { id: 'month', label: '30일' },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => onSearchDateChange(period.id as 'today' | 'week' | 'month')}
                  className={`py-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    searchDate === period.id
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">카메라</label>
            <select
              value={searchCamera}
              onChange={(event) => onSearchCameraChange(event.target.value)}
              className="w-full px-3 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-slate-300"
            >
              <option value={ALL_CAMERAS_VALUE}>전체 카메라</option>
              {cameraOptions.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">키워드</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => onSearchKeywordChange(event.target.value)}
                placeholder="낙상, 병실, 복도"
                className="w-full pl-9 pr-4 py-2 bg-[#020817] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3 bg-slate-900/30 border-b border-slate-800 flex justify-between text-xs text-slate-400">
          <span className="font-semibold">조회 결과 {displayCount}건</span>
          <span className="text-[10px]">최근 이벤트 기록</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {historyAlerts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-xs text-slate-500">조건에 맞는 이벤트 기록이 없습니다.</p>
            </div>
          ) : (
            historyAlerts.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-800/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{log.label}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-mono">
                      <span>위치: {log.camera}</span>
                      <span>/</span>
                      <span>{new Date(log.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.\s/g, '-').replace(/\./g, '')} {log.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenIncident(log)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                  >
                    열기
                  </button>
                </div>
              </div>
            ))
          )}
          
          {totalPages > 1 && (
            <div className="p-4 flex justify-center items-center gap-2 border-t border-slate-800 bg-[#071329]">
              <button
                onClick={() => onGoToPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors"
              >
                &lt;
              </button>
              
              {visiblePages.map(page => (
                <button
                  key={page}
                  onClick={() => onGoToPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    currentPage === page 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {page + 1}
                </button>
              ))}

              <button
                onClick={() => onGoToPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
