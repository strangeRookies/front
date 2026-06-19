/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_STREAM_MODE?: 'raw' | 'overlay';
  readonly VITE_HLS_BASE_URL?: string;
  readonly VITE_OVERLAY_BASE_URL?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
