import { useCallback, useEffect, useRef, useState } from 'react';

interface UseFullscreenCameraResult {
  readonly activeFullscreenCameraId: string | null;
  readonly exitFullscreen: () => Promise<void>;
  readonly requestCameraFullscreen: (cameraId: string) => Promise<void>;
  readonly setCameraCardRef: (cameraId: string, element: HTMLDivElement | null) => void;
}

export function useFullscreenCamera(): UseFullscreenCameraResult {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeFullscreenCameraId, setActiveFullscreenCameraId] = useState<string | null>(null);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  const syncFullscreenState = useCallback(() => {
    const fullscreenElement = document.fullscreenElement;
    if (!fullscreenElement) {
      setActiveFullscreenCameraId(null);
      return;
    }

    const activeEntry = Object.entries(cardRefs.current).find(([, element]) => element === fullscreenElement);
    setActiveFullscreenCameraId(activeEntry?.[0] ?? null);
  }, []);

  const requestCameraFullscreen = useCallback(async (cameraId: string) => {
    const target = cardRefs.current[cameraId];
    if (!target?.requestFullscreen) return;

    try {
      await target.requestFullscreen();
      setActiveFullscreenCameraId(cameraId);
    } catch (error) {
      if (error instanceof Error) {
        console.warn('카메라 전체 화면 전환에 실패했습니다.', error.message);
        return;
      }
      throw error;
    }
  }, []);

  const setCameraCardRef = useCallback((cameraId: string, element: HTMLDivElement | null) => {
    cardRefs.current[cameraId] = element;

    if (element || activeFullscreenCameraId !== cameraId) return;
    void exitFullscreen().catch((error) => {
      if (error instanceof Error) {
        console.warn('카메라 전체 화면 종료에 실패했습니다.', error.message);
        return;
      }
      throw error;
    });
  }, [activeFullscreenCameraId, exitFullscreen]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, [syncFullscreenState]);

  useEffect(() => () => {
    if (!activeFullscreenCameraId) return;
    void exitFullscreen().catch((error) => {
      if (error instanceof Error) {
        console.warn('카메라 전체 화면 정리에 실패했습니다.', error.message);
        return;
      }
      throw error;
    });
  }, [activeFullscreenCameraId, exitFullscreen]);

  return {
    activeFullscreenCameraId,
    exitFullscreen,
    requestCameraFullscreen,
    setCameraCardRef,
  };
}
