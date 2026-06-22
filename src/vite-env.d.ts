/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_STREAM_MODE?: 'raw' | 'overlay' | 'webrtc';
  readonly VITE_HLS_BASE_URL?: string;
  readonly VITE_WEBRTC_BASE_URL?: string;
  readonly VITE_STREAM_BASE_URL?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_WS_URL?: string;
  readonly VITE_STREAM_FALLBACK_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
