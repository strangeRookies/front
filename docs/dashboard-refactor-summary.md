# Dashboard Refactor Summary

## Changed files

- `src/features/dashboard/pages/UserDashboard.tsx`
- `src/features/dashboard/hooks/useFullscreenCamera.ts`
- `src/features/dashboard/hooks/useDashboardAlerts.ts`
- `src/features/dashboard/types/dashboard.ts`
- `src/features/dashboard/utils/dashboardStatus.ts`
- `src/features/dashboard/data/cameras.ts`
- `src/features/dashboard/components/AlertNotification.tsx`
- `src/features/dashboard/components/CCTVVideoPlayer.tsx`
- `src/features/dashboard/components/LiveCameraGrid.tsx`
- `src/features/dashboard/components/DashboardHomeView.tsx`
- `src/features/dashboard/components/DashboardAlertsView.tsx`
- `src/features/dashboard/components/DashboardHistoryView.tsx`
- `src/features/dashboard/components/DashboardCameraManagementView.tsx`
- `src/features/dashboard/components/DashboardMyPageView.tsx`
- `src/features/dashboard/components/DashboardQnaView.tsx`
- `src/features/dashboard/modals/AddCameraModal.tsx`
- `src/features/dashboard/modals/NewInquiryModal.tsx`
- `src/features/dashboard/modals/IncidentPlaybackModal.tsx`
- `scripts/verify-ai-acknowledge-contract.mjs`

## Extracted components and hooks

- `DashboardHomeView`: live camera area + AI danger panel
- `DashboardAlertsView`: recent alert board
- `DashboardHistoryView`: filterable playback history
- `DashboardCameraManagementView`: registered camera management
- `DashboardMyPageView`: profile / password / notification / account tabs
- `DashboardQnaView`: inquiry list and detail view
- `AddCameraModal`: camera registration modal
- `NewInquiryModal`: inquiry creation modal
- `IncidentPlaybackModal`: playback overlay
- `useFullscreenCamera`: camera card fullscreen enter/exit state, ESC/fullscreenchange sync, ref cleanup on camera switch/unmount
- `useDashboardAlerts`: alert sync, history filtering, acknowledgement state sync
- `dashboard.ts`: shared dashboard-specific types
- `dashboardStatus.ts`: menu/category constants and small formatting helpers

## Latest refinement

- Extracted camera fullscreen behavior out of `LiveCameraGrid` into `useFullscreenCamera`.
- Fullscreen state now follows browser `fullscreenchange`, so ESC and native close actions reset state safely.
- Camera card refs are cleaned up when cameras switch or unmount; if the active fullscreen card disappears, the hook requests fullscreen exit.
- Replaced English/temporary dashboard, camera, event, history, Q&A, notification, and playback labels with Korean product copy.
- No-event surfaces now say “현재 감지된 이상 상황이 없습니다.” and “실시간 모니터링 중입니다.”
- Detection copy remains scoped to actual event payload rendering (`AiAlertCard`, `useDashboardAlerts`, `markAiDangerCameras`) and is not emitted by normal camera/empty states.

## Preserved behavior

- `UserDashboard.tsx` remains the top-level container/orchestrator.
- Existing MQTT/EQMS -> backend -> frontend alert flow still enters through `useAiAlertActions`.
- Alert cards, history, and playback still derive from the same AI event stream.
- Camera cards still render through `LiveCameraGrid`.
- No new fake detected state was added during this refactor.
- Existing fingerprint-based acknowledgement and deduplication behavior is unchanged.

## Verification

- Passed: `npx.cmd tsc --noEmit`
- Passed: `npm.cmd run test:ai-ack`
- Blocked: `npm.cmd run build` and `npx.cmd vite --host 127.0.0.1 --port 5173` fail inside the sandbox with `Cannot read directory "../../..": Access is denied` while loading `vite.config.ts`.
- Blocked: browser/manual fullscreen QA could not run because the Vite dev server fails for the same sandbox access-denied reason.
- LSP diagnostics could not run because `typescript-language-server` is not installed in this environment.

## Next improvements

- Tighten alert deduplication and acknowledgement UX now that the container file is smaller.
- Add buildable tests around the extracted views and the new `useDashboardAlerts` hook.
- Split the remaining oversized `UserDashboard.tsx` container below the 250 pure-LOC ceiling.
- Re-run Vite build and browser fullscreen QA outside the current sandbox restriction.
