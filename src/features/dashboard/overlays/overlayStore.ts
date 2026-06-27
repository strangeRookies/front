import { create } from 'zustand';
import type { LiveCamera } from '../data/cameras';
import type { OverlayMessage } from './overlayTypes';

interface CameraOverlayState {
  readonly overlays: Map<string, OverlayMessage>;
  readonly setOverlay: (message: OverlayMessage) => void;
  readonly clearOverlay: (cameraLoginId: string) => void;
  readonly clearAllOverlays: () => void;
}

export const useCameraOverlayStore = create<CameraOverlayState>((set) => ({
  overlays: new Map(),
  setOverlay: (message) => {
    set((state) => {
      const overlays = new Map(state.overlays);
      overlays.set(message.cameraLoginId, message);
      return { overlays };
    });
  },
  clearOverlay: (cameraLoginId) => {
    set((state) => {
      if (!state.overlays.has(cameraLoginId)) {
        return state;
      }
      const overlays = new Map(state.overlays);
      overlays.delete(cameraLoginId);
      return { overlays };
    });
  },
  clearAllOverlays: () => {
    set((state) => {
      if (state.overlays.size === 0) {
        return state;
      }
      return { overlays: new Map() };
    });
  },
}));

export function useCameraOverlay(camera: LiveCamera): OverlayMessage | undefined {
  return useCameraOverlayStore((state) => (
    state.overlays.get(camera.cameraLoginId ?? '')
    ?? state.overlays.get(camera.id)
    ?? state.overlays.get(camera.cameraDbId ?? '')
    ?? state.overlays.get(camera.name)
    ?? undefined
  ));
}
