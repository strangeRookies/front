import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { acknowledgeAndRequestRecording } from '../app/api/aiIncidentRequests';
import type { LiveCamera } from '../features/dashboard/data/cameras';
import {
  aiEventKey,
  findCameraForAiEvent,
  focusCameraFirst,
  isAiAlertEnabledRoute,
  isDangerAiEvent,
  markAiDangerCameras,
} from '../shared/utils/aiAlerts';
import type { AiEvent } from './useAiEvents';
import { useAiEvents } from './useAiEvents';
import { useRepeatingAlarm } from './useRepeatingAlarm';

interface UseAiAlertActionsOptions {
  readonly userType: 'individual' | 'corporate';
  readonly username: string;
  readonly liveCameras: readonly LiveCamera[];
  readonly focusHome: () => void;
}

export function useAiAlertActions({ userType, username, liveCameras, focusHome }: UseAiAlertActionsOptions) {
  const aiAlertsEnabled = isAiAlertEnabledRoute(userType === 'corporate' ? 'company' : 'personal');
  const aiEvents = useAiEvents({ enabled: aiAlertsEnabled });
  const [acknowledgedAiEventIds, setAcknowledgedAiEventIds] = useState<Set<string>>(() => new Set());
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(null);

  const dangerAiEvents = useMemo(() => aiEvents.filter(isDangerAiEvent), [aiEvents]);
  const unacknowledgedAiEvents = useMemo(
    () => dangerAiEvents.filter(event => !acknowledgedAiEventIds.has(aiEventKey(event))),
    [acknowledgedAiEventIds, dangerAiEvents],
  );
  const aiMarkedCameras = useMemo(
    () => markAiDangerCameras(liveCameras, unacknowledgedAiEvents),
    [liveCameras, unacknowledgedAiEvents],
  );
  const focusedLiveCameras = useMemo(
    () => focusCameraFirst(aiMarkedCameras, focusedCameraId),
    [aiMarkedCameras, focusedCameraId],
  );

  useRepeatingAlarm({ enabled: aiAlertsEnabled && unacknowledgedAiEvents.length > 0, intervalMs: 2000 });

  const focusAiEventCamera = useCallback((event: AiEvent) => {
    const camera = findCameraForAiEvent(liveCameras, event);
    if (camera) {
      setFocusedCameraId(camera.id);
    }
    focusHome();
  }, [focusHome, liveCameras]);

  const handleConfirmAiEvent = useCallback((event: AiEvent) => {
    focusAiEventCamera(event);
    setAcknowledgedAiEventIds(prev => {
      const next = new Set(prev);
      next.add(aiEventKey(event));
      return next;
    });
    void acknowledgeAndRequestRecording(event, username).catch(error => {
      if (error instanceof Error) {
        toast.error('AI 알림 확인은 처리됐지만 녹화 요청 저장에 실패했습니다.', {
          description: error.message,
        });
        return;
      }
      throw error;
    });
  }, [focusAiEventCamera, username]);

  return {
    acknowledgedAiEventIds,
    dangerAiEvents,
    focusedLiveCameras,
    focusAiEventCamera,
    handleConfirmAiEvent,
    setFocusedCameraId,
  };
}
