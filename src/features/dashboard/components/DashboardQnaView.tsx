import { Check, ChevronLeft, Clock, MessageSquare, Plus, Shield } from 'lucide-react';
import type { Inquiry } from '../../../shared/types/inquiry';
import type { InquiryCategory } from '../types/dashboard';
import { CATEGORY_STYLES } from '../utils/dashboardStatus';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return dateStr;
  }
};

interface DashboardQnaViewProps {
  inquiries: readonly Inquiry[];
  selectedQnaId: number | null;
  onBack: () => void;
  onCreateInquiry: () => void;
  onSelectQna: (id: number) => void;
}

export function DashboardQnaView({
  inquiries,
  selectedQnaId,
  onBack,
  onCreateInquiry,
  onSelectQna,
}: DashboardQnaViewProps) {
  const selectedQna = inquiries.find((inquiry) => inquiry.id === selectedQnaId) ?? null;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020817] w-full">
      {selectedQna ? (
        // --- 상세 뷰 (Single Pane) ---
        <div className="flex-1 overflow-y-auto p-4 flex flex-col w-full h-full">
          <div className="max-w-2xl w-full mx-auto space-y-4 pb-10">
            <button 
              onClick={() => onSelectQna(null as any)} 
              className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-white cursor-pointer mb-2 bg-slate-800/30 px-3 py-2 rounded-xl w-fit transition-colors active:bg-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" /> 목록으로
            </button>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 bg-[#061224] border-b border-slate-800">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block ${CATEGORY_STYLES[selectedQna.category as InquiryCategory]}`}>
                  {selectedQna.category}
                </span>
                <h3 className="text-base font-extrabold text-white mt-3 leading-tight">{selectedQna.title}</h3>
                <p className="text-[11px] text-slate-500 mt-2">작성일 {formatDate(selectedQna.createdAt)}</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.content}</p>
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관리자 답변</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              
              {selectedQna.status === 'COMPLETED' && selectedQna.replyContent ? (
                <div className="bg-[#0f192b] border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-400 block leading-tight">관리자</span>
                      <span className="text-[10px] text-slate-500">{formatDate(selectedQna.repliedAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.replyContent}</p>
                </div>
              ) : (
                <div className="bg-[#071329] border border-dashed border-slate-700 rounded-2xl p-10 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-semibold">답변을 확인하고 있습니다.</p>
                  <p className="text-[11px] text-slate-500 mt-1">조금만 기다려주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // --- 리스트 뷰 (Single Pane) ---
        <div className="flex-1 flex flex-col w-full h-full">
          <div className="p-4 border-b border-slate-800/60 bg-[#061224] flex items-center justify-between flex-shrink-0 z-10">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                내 문의
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                전체 {inquiries.length}건 / 답변 대기 {inquiries.filter((item) => item.status === 'WAITING').length}건
              </p>
            </div>
            <button 
              onClick={onCreateInquiry} 
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[12px] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> 새 문의
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
            {inquiries.length === 0 ? (
              <div className="py-20 text-center h-full flex flex-col justify-center">
                <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-semibold">등록된 문의가 없습니다.</p>
                <p className="text-xs text-slate-500 mt-2">서비스 이용 중 궁금한 점을 남겨주세요.</p>
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  onClick={() => onSelectQna(inquiry.id)}
                  className="w-full text-left bg-[#071329] border border-slate-800 hover:border-slate-700 active:bg-slate-800/50 rounded-2xl p-4 cursor-pointer transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[inquiry.category as InquiryCategory]}`}>
                      {inquiry.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      inquiry.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {inquiry.status === 'COMPLETED' ? <><Check className="w-3 h-3" />답변 완료</> : '답변 대기'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5 truncate leading-tight">{inquiry.title}</h3>
                  <p className="text-xs text-slate-400 truncate mb-2">{inquiry.content}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{formatDate(inquiry.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
