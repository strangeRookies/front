import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { acknowledgeAndRequestRecording } from '../app/api/aiIncidentRequests';
import type { LiveCamera } from '../features/dashboard/data/cameras';
import {
  aiEventFingerprint,
  findCameraForAiEvent,
  focusCameraFirst,
  isAiAlertEnabledRoute,
  isDangerAiEvent,
  markAiDangerCameras,
} from '../shared/utils/aiAlerts';
import { pruneAcknowledgedFingerprints } from '../shared/utils/aiEventFeed';
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
  const feedState = useAiEvents({ enabled: aiAlertsEnabled });
  const aiEvents = feedState.events;
  const connectionState = feedState.connectionState;

  // Acknowledged fingerprints (not timestamps, so stable across re-publishes)
  const [acknowledgedFingerprints, setAcknowledgedFingerprints] = useState<Set<string>>(() => new Set());
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(null);

  const dangerAiEvents = useMemo(() => aiEvents.filter(isDangerAiEvent), [aiEvents]);

  // Expire acknowledged fingerprints that are no longer in the active window
  useEffect(() => {
    setAcknowledgedFingerprints((prev) => pruneAcknowledgedFingerprints(prev, dangerAiEvents));
  }, [dangerAiEvents]);

  const unacknowledgedAiEvents = useMemo(
    () => dangerAiEvents.filter((event) => !acknowledgedFingerprints.has(aiEventFingerprint(event))),
    [acknowledgedFingerprints, dangerAiEvents],
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

  const focusAiEventCamera = useCallback(
    (event: AiEvent) => {
      const camera = findCameraForAiEvent(liveCameras, event);
      if (camera) setFocusedCameraId(camera.id);
      focusHome();
    },
    [focusHome, liveCameras],
  );

  const handleConfirmAiEvent = useCallback(
    (event: AiEvent) => {
      focusAiEventCamera(event);
      const fp = aiEventFingerprint(event);
      setAcknowledgedFingerprints((prev) => {
        const next = new Set(prev);
        next.add(fp);
        return next;
      });
      void acknowledgeAndRequestRecording(event, username).catch((error) => {
        if (error instanceof Error) {
          toast.error('AI 알림 확인은 처리됐지만 녹화 요청 저장에 실패했습니다.', {
            description: error.message,
          });
          return;
        }
        throw error;
      });
    },
    [focusAiEventCamera, username],
  );

  return {
    // Expose fingerprint-based set (primary)
    acknowledgedAiEventIds: acknowledgedFingerprints,
    dangerAiEvents,
    focusedLiveCameras,
    focusAiEventCamera,
    handleConfirmAiEvent,
    setFocusedCameraId,
    connectionState,
  };
}
