import { Download, Search, Video } from 'lucide-react';
import type { IncidentAlert } from '../types/dashboard';

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
}: DashboardHistoryViewProps) {
  const displayCount = totalHistoryElements;

  // Pagination logic to display fixed blocks of 5 page buttons (e.g., 1~5, 6~10)
  const currentChunk = Math.floor(currentPage / 5);
  const startPage = currentChunk * 5;
  const endPage = Math.min(totalPages, startPage + 5);
  const visiblePages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl flex flex-col">
      <div className="px-1">
        <h2 className="text-base font-extrabold text-white">이벤트 기록</h2>
        <p className="text-xs text-slate-400 mt-1">
          실제 수신된 이벤트 기록을 기간, 카메라, 키워드로 조회합니다.
        </p>
      </div>
      <div className="bg-[#071329] border border-slate-800 p-3 rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">기간</label>
            <div className="flex gap-2">
              {[
                { id: 'today', label: '오늘' },
                { id: 'week', label: '7일' },
                { id: 'month', label: '30일' },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => onSearchDateChange(period.id as 'today' | 'week' | 'month')}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    searchDate === period.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'border-slate-700 bg-[#020817] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">카메라</label>
            <select
              value={searchCamera}
              onChange={(event) => onSearchCameraChange(event.target.value)}
              className="w-full px-2 py-1.5 bg-[#020817] border border-slate-700 rounded-lg text-[11px] text-slate-200 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="전체">전체 카메라</option>
              {cameraOptions.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider">키워드</label>
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => onSearchKeywordChange(event.target.value)}
                placeholder="키워드 검색"
                className="w-full pl-6 pr-2 py-1.5 bg-[#020817] border border-slate-700 rounded-lg text-[11px] text-white placeholder-slate-600 outline-none focus:border-blue-500 transition-colors"
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
              <button 
                key={log.id} 
                onClick={() => onOpenIncident(log)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 active:bg-slate-800/50 transition-colors text-left cursor-pointer border-b border-slate-800/50 last:border-0"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner flex-shrink-0">
                    <Video className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-white truncate leading-tight">{log.label}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono truncate">
                      <span className="truncate max-w-[100px]">{log.camera}</span>
                      <span className="text-slate-700">|</span>
                      <span>{new Date(log.timestamp).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\.\s/g, '/').replace(/\./g, '')} {log.time}</span>
                    </div>
                  </div>
                </div>

              </button>
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
