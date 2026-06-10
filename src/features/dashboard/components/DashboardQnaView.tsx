import { Check, ChevronLeft, Clock, MessageSquare, Plus, Shield } from 'lucide-react';
import type { Inquiry } from '../../../shared/types/inquiry';
import type { InquiryCategory } from '../types/dashboard';
import { CATEGORY_STYLES } from '../utils/dashboardStatus';

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
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 bg-[#020817] border-r border-slate-800/50 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              내 문의
            </h2>
            <button onClick={onCreateInquiry} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer">
              <Plus className="w-3 h-3" /> 새 문의
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            전체 {inquiries.length}건 / 답변 대기 {inquiries.filter((item) => item.status === 'WAITING').length}건
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {inquiries.length === 0 ? (
            <div className="py-14 text-center">
              <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">등록된 문의가 없습니다.</p>
              <p className="text-[10px] text-slate-600 mt-1">필요한 내용을 새 문의로 남겨주세요.</p>
            </div>
          ) : (
            inquiries.map((inquiry) => (
              <button
                key={inquiry.id}
                onClick={() => onSelectQna(inquiry.id)}
                className={`w-full text-left bg-[#071329] border rounded-xl p-3 cursor-pointer ${
                  selectedQnaId === inquiry.id ? 'border-blue-500/50 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[inquiry.category as InquiryCategory]}`}>
                    {inquiry.category}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    inquiry.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {inquiry.status === 'COMPLETED' ? <><Check className="w-2.5 h-2.5" />답변 완료</> : '답변 대기'}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">{inquiry.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{inquiry.createdAt}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedQna ? (
          <div className="max-w-2xl space-y-6">
            <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" /> 목록으로
            </button>
            <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-[#061224] border-b border-slate-800">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[selectedQna.category as InquiryCategory]}`}>
                  {selectedQna.category}
                </span>
                <h3 className="text-sm font-extrabold text-white mt-2">{selectedQna.title}</h3>
                <p className="text-[10px] text-slate-500 mt-1.5">작성일 {selectedQna.createdAt}</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.content}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관리자 답변</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              {selectedQna.status === 'COMPLETED' && selectedQna.replyContent ? (
                <div className="bg-[#0f192b] border border-blue-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <Shield className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-blue-400">관리자</span>
                    <span className="text-[10px] text-slate-500">{selectedQna.repliedAt}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedQna.replyContent}</p>
                </div>
              ) : (
                <div className="bg-[#071329] border border-dashed border-slate-700 rounded-2xl p-10 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">답변을 준비 중입니다.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">문의를 선택하거나 새 문의를 작성해 주세요.</p>
              <button onClick={onCreateInquiry} className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> 새 문의
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
