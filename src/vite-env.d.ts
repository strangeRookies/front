/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_STREAM_MODE?: 'raw' | 'overlay' | 'webrtc' | 'mjpeg';
  readonly VITE_HLS_BASE_URL?: string;
  readonly VITE_WEBRTC_BASE_URL?: string;
  readonly VITE_MJPEG_BASE_URL?: string;
  readonly VITE_OVERLAY_BASE_URL?: string;
  readonly VITE_STREAM_BASE_URL?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_WS_URL?: string;
  readonly VITE_STREAM_FALLBACK_ENABLED?: string;
  readonly VITE_FRONT_OVERLAY_SYNC_DEBUG?: string;
  readonly VITE_FRONT_OVERLAY_DELAY_MS?: string;
  readonly VITE_FRONT_OVERLAY_MAX_BUFFER_AGE_MS?: string;
  readonly VITE_FRONT_OVERLAY_MAX_BUFFER_SIZE?: string;
  readonly VITE_FRONT_OVERLAY_MATCH_THRESHOLD_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
