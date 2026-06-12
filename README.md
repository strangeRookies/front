
  # CCTV 관리자 대시보드

  This is a code bundle for CCTV 관리자 대시보드. The original project is available at https://www.figma.com/design/FXYF8x29t0JGy3BWTlUhVl/CCTV-%EA%B4%80%EB%A6%AC%EC%9E%90-%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Stream modes

  The monitoring dashboard separates raw MediaMTX HLS from AI overlay MJPEG.

  ```env
  VITE_STREAM_MODE=overlay
  VITE_HLS_BASE_URL=http://localhost:8888
  VITE_OVERLAY_BASE_URL=http://localhost:8010
  ```

  - `overlay`: default. `cam_01` maps to `http://localhost:8010`, `cam_02` to `http://localhost:8011`, and so on.
  - `raw`: uses MediaMTX HLS at `http://localhost:8888/{cameraLoginId}/index.m3u8`.
  - For SSH tunnel development from Windows, keep both base URLs as `localhost`.

  ## AI alert routing

  Active AI danger alerts are routed only to the personal/user and company/business monitoring dashboard. The admin dashboard does not subscribe to the AI SSE event stream and does not play alarm sounds.

  When a danger event is unacknowledged, the monitoring dashboard repeats an alarm every 2 seconds. Clicking an alert card or Confirm focuses the related camera, and Confirm marks that event as acknowledged so the alarm stops once all current danger alerts are confirmed.

  Confirm also sends `POST /api/incidents/{eventId}/acknowledge-and-record` to the backend with `preFrames=150`, `postFrames=150`, and `totalFrames=300`. The backend records the request as `RECORDING_REQUESTED`; actual AI clip capture is still a later service contract.
