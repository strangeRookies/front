import { create } from 'zustand';
import type { LiveCamera } from '../data/cameras';
import type { OverlayMessage } from './overlayTypes';

interface CameraOverlayState {
  readonly overlays: Map<string, OverlayMessage>;
  readonly frameSyncBuffers: Map<string, OverlayMessage[]>;
  readonly overlaySyncBuffers: Map<string, OverlayMessage[]>;
  readonly setOverlay: (message: OverlayMessage) => void;
  readonly addFrameSync: (message: OverlayMessage) => void;
  readonly addOverlaySync: (message: OverlayMessage) => void;
  readonly clearOverlay: (cameraLoginId: string) => void;
  readonly clearAllOverlays: () => void;
}

const MAX_BUFFER_SIZE = 100;

export const useCameraOverlayStore = create<CameraOverlayState>((set) => ({
  overlays: new Map(),
  frameSyncBuffers: new Map(),
  overlaySyncBuffers: new Map(),
  setOverlay: (message) => {
    set((state) => {
      const overlays = new Map(state.overlays);
      overlays.set(message.cameraLoginId, message);
      return { overlays };
    });
  },
  addFrameSync: (message) => {
    set((state) => {
      const frameSyncBuffers = new Map(state.frameSyncBuffers);
      const now = Date.now();
      const list = (frameSyncBuffers.get(message.cameraLoginId) || [])
        .filter((msg) => !msg.receivedAtMs || now - msg.receivedAtMs < 5000);
      list.push(message);
      if (list.length > MAX_BUFFER_SIZE) {
        list.shift();
      }
      frameSyncBuffers.set(message.cameraLoginId, list);
      return { frameSyncBuffers };
    });
  },
  addOverlaySync: (message) => {
    set((state) => {
      const overlaySyncBuffers = new Map(state.overlaySyncBuffers);
      const now = Date.now();
      const list = (overlaySyncBuffers.get(message.cameraLoginId) || [])
        .filter((msg) => !msg.receivedAtMs || now - msg.receivedAtMs < 5000);
      list.push(message);
      if (list.length > MAX_BUFFER_SIZE) {
        list.shift();
      }
      overlaySyncBuffers.set(message.cameraLoginId, list);
      return { overlaySyncBuffers };
    });
  },
  clearOverlay: (cameraLoginId) => {
    set((state) => {
      const overlays = new Map(state.overlays);
      overlays.delete(cameraLoginId);
      
      const frameSyncBuffers = new Map(state.frameSyncBuffers);
      frameSyncBuffers.delete(cameraLoginId);
      
      const overlaySyncBuffers = new Map(state.overlaySyncBuffers);
      overlaySyncBuffers.delete(cameraLoginId);
      
      return { overlays, frameSyncBuffers, overlaySyncBuffers };
    });
  },
  clearAllOverlays: () => {
    set({
      overlays: new Map(),
      frameSyncBuffers: new Map(),
      overlaySyncBuffers: new Map()
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

const EMPTY_BUFFER: OverlayMessage[] = [];

export function useCameraFrameSyncBuffer(cameraLoginId: string): OverlayMessage[] {
  return useCameraOverlayStore((state) => state.frameSyncBuffers.get(cameraLoginId) || EMPTY_BUFFER);
}

export function useCameraOverlaySyncBuffer(cameraLoginId: string): OverlayMessage[] {
  return useCameraOverlayStore((state) => state.overlaySyncBuffers.get(cameraLoginId) || EMPTY_BUFFER);
}
