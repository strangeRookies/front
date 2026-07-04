
  # CCTV 관리자 대시보드

  This is a code bundle for CCTV 관리자 대시보드. The original project is available at https://www.figma.com/design/FXYF8x29t0JGy3BWTlUhVl/CCTV-%EA%B4%80%EB%A6%AC%EC%9E%90-%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Stream modes
  
  The monitoring dashboard supports raw MediaMTX HLS, WebRTC WHEP, and AI overlay MJPEG.
  
  ```env
  VITE_STREAM_MODE=mjpeg
  VITE_WEBRTC_BASE_URL=http://localhost:8889
  VITE_HLS_BASE_URL=http://localhost:8888
  VITE_MJPEG_BASE_URL=http://localhost:8010
  VITE_STREAM_FALLBACK_ENABLED=true
  ```
  
  - `webrtc`: Uses MediaMTX WebRTC WHEP at `${VITE_WEBRTC_BASE_URL}/{cameraLoginId}/whep`.
  - `raw`: Uses MediaMTX HLS at `${VITE_HLS_BASE_URL}/{cameraLoginId}/index.m3u8`.
  - `mjpeg`: Uses AI MJPEG at `${VITE_MJPEG_BASE_URL}/mjpeg/{cameraLoginId}`.
  - `overlay`: Uses backend-reported AI overlay MJPEG URLs for compatibility.
  
  ### Option A: Direct GPU PC Connection
  If you are not using SSH tunnels, point the base URLs directly to the GPU PC IP (e.g. `192.168.0.66`):
  ```env
  VITE_WEBRTC_BASE_URL=http://192.168.0.66:8889
  VITE_HLS_BASE_URL=http://192.168.0.66:8888
  ```
  
  ### Option B: SSH Local Port Forwarding
  When developing from a local machine through an SSH tunnel, you can keep the base URLs as `localhost`. Make sure to run the following forwarding command:
  ```bash
  ssh -L 8888:127.0.0.1:8888 -L 8889:127.0.0.1:8889 -L 8189:127.0.0.1:8189 welabs@192.168.0.66
  ```

  ## AI alert routing

  Active AI danger alerts are routed only to the personal/user and company/business monitoring dashboard. The admin dashboard does not subscribe to the AI SSE event stream and does not play alarm sounds.

  When a danger event is unacknowledged, the monitoring dashboard repeats an alarm every 2 seconds. Clicking an alert card or Confirm focuses the related camera, and Confirm marks that event as acknowledged so the alarm stops once all current danger alerts are confirmed.

  Confirm also sends `POST /api/incidents/{eventId}/acknowledge-and-record` to the backend with `preFrames=150`, `postFrames=150`, and `totalFrames=300`. The backend records the request as `RECORDING_REQUESTED`; actual AI clip capture is still a later service contract.
