/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_STREAM_BASE_URL?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_CAMERA_1_STREAM_URL?: string;
  readonly VITE_CAMERA_2_STREAM_URL?: string;
  readonly VITE_CAMERA_3_STREAM_URL?: string;
  readonly VITE_CAMERA_4_STREAM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
