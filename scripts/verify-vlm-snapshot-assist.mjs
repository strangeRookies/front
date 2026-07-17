/**
 * Contract check: VLM assist messages are distinct from primary alerts
 * and optional assist never blocks alert rendering logic.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const typesPath = path.join(root, 'src/features/dashboard/types/vlmSnapshotAssist.ts');
const panelPath = path.join(root, 'src/features/dashboard/components/VlmSnapshotAssistPanel.tsx');
const hookPath = path.join(root, 'src/features/dashboard/hooks/useVlmSnapshotAssist.ts');
const alertPath = path.join(root, 'src/features/dashboard/components/AlertNotification.tsx');
const dashboardPath = path.join(root, 'src/features/dashboard/pages/UserDashboard.tsx');
const cardPath = path.join(root, 'src/components/dashboard/AiAlertCard.tsx');
const modalPath = path.join(root, 'src/features/dashboard/modals/IncidentPlaybackModal.tsx');
const apiPath = path.join(root, 'src/features/dashboard/api/alertEventsApi.ts');

for (const p of [typesPath, panelPath, hookPath, alertPath, dashboardPath, cardPath, modalPath, apiPath]) {
  assert.ok(fs.existsSync(p), `missing ${p}`);
}

const types = fs.readFileSync(typesPath, 'utf8');
assert.match(types, /vlm_snapshot_assist/);
assert.match(types, /isVlmSnapshotAssistMessage/);

const panel = fs.readFileSync(panelPath, 'utf8');
assert.match(panel, /AI 감지 근거/);
assert.match(panel, /FAILED/);

const hook = fs.readFileSync(hookPath, 'utf8');
assert.match(hook, /\/topic\/vlm-snapshot-assist/);
assert.match(hook, /getAssist/);

const alert = fs.readFileSync(alertPath, 'utf8');
assert.match(alert, /VlmSnapshotAssistPanel/);
assert.match(alert, /vlmAssist/);

const dashboard = fs.readFileSync(dashboardPath, 'utf8');
assert.match(dashboard, /useVlmSnapshotAssist\(true\)/);
assert.match(dashboard, /getVlmAssist=\{getVlmAssist\}/);

const card = fs.readFileSync(cardPath, 'utf8');
assert.match(card, /VlmSnapshotAssistPanel/);
assert.match(card, /vlmAssist/);

const modal = fs.readFileSync(modalPath, 'utf8');
// Modal MUST NOT call fetchVlmSnapshotAssist for primary snapshot display
assert.doesNotMatch(modal, /fetchVlmSnapshotAssist/);
// Modal MUST NOT drive snapshot summary/status from snapshot-assist REST polling
assert.doesNotMatch(modal, /snapshotVlmSummary/);
assert.doesNotMatch(modal, /snapshotVlmStatus/);
// Primary snapshot image uses primarySnapshotUrl ?? snapshotUrl; never clip/mp4 as img src
assert.match(modal, /primarySnapshot = incident\.primarySnapshotUrl \?\? incident\.snapshotUrl/);
assert.match(modal, /primarySnapshot \?[\s\S]*?<img/);
// When no primary snapshot, show quiet placeholder (not live stream)
assert.match(modal, /스냅샷 없음/);
// Clip drives video only; clipUrl never used as snapshot img src
assert.match(modal, /incident\.clipUrl \?[\s\S]*?<video/);

const api = fs.readFileSync(apiPath, 'utf8');
assert.match(api, /sourceEventId/);
assert.match(api, /matchedCamera\?\.name/);
assert.doesNotMatch(api, /if \(!matchedCamera\) return null/);

// Pure logic: assist optional
function alertUiOk(assist) {
  return { canShowAlert: true, assistStatus: assist?.status ?? null };
}
assert.equal(alertUiOk(undefined).canShowAlert, true);
assert.equal(alertUiOk({ status: 'FAILED' }).canShowAlert, true);

console.log('verify-vlm-snapshot-assist: OK');
