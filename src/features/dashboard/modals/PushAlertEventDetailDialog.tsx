import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog';
import {
  fetchAlertEventDetail,
  type AlertEventDetailResponse,
} from '../api/alertEventsApi';

interface PushAlertEventDetailDialogProps {
  eventId: number | null;
  onClose: () => void;
}

export function PushAlertEventDetailDialog({ eventId, onClose }: PushAlertEventDetailDialogProps) {
  const [detail, setDetail] = useState<AlertEventDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (eventId == null) {
      setDetail(null);
      setHasError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    void fetchAlertEventDetail(eventId)
      .then((response) => {
        if (!cancelled) {
          setDetail(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const snapshotUrl = detail?.snapshots?.[0]?.snapshotUrl;

  return (
    <Dialog open={eventId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[min(94vw,680px)] overflow-hidden border-slate-800 bg-[#071329] p-0 text-slate-100">
        <DialogHeader className="border-b border-slate-800 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" aria-hidden="true" />
            <DialogTitle className="text-base font-extrabold text-white">위험 이벤트 상세</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            알림 이벤트 #{eventId ?? '-'}의 감지 정보입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[64vh] overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-400">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              상세 정보를 불러오는 중입니다.
            </div>
          )}

          {!isLoading && hasError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              이벤트 상세 정보를 불러오지 못했습니다. 로그인 상태와 네트워크를 확인해 주세요.
            </div>
          )}

          {!isLoading && detail && (
            <div className="space-y-4">
              {snapshotUrl && (
                <img
                  src={snapshotUrl}
                  alt={`위험 이벤트 ${detail.alertEventId} 스냅샷`}
                  className="max-h-72 w-full rounded-xl border border-slate-800 bg-black object-contain"
                />
              )}

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <DetailItem label="시나리오" value={detail.scenarioType} />
                <DetailItem label="심각도" value={detail.severity} />
                <DetailItem label="상태" value={detail.status} />
                <DetailItem
                  label="신뢰도"
                  value={detail.confidenceScore == null ? '-' : `${Math.round(detail.confidenceScore * 100)}%`}
                />
                <DetailItem label="카메라 ID" value={detail.cameraId?.toString() ?? '-'} />
                <DetailItem label="감지 시각" value={formatDateTime(detail.detectedAt)} />
              </dl>

              {detail.vlmDescription && (
                <section className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <h3 className="text-xs font-extrabold text-blue-300">AI 분석</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-200">{detail.vlmDescription}</p>
                </section>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-800 px-5 py-4">
          <DialogClose className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-500 sm:w-auto">
            닫기
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <dt className="text-[10px] font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
