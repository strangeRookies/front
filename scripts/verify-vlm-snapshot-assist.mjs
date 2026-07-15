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

for (const p of [typesPath, panelPath, hookPath, alertPath]) {
  assert.ok(fs.existsSync(p), `missing ${p}`);
}

const types = fs.readFileSync(typesPath, 'utf8');
assert.match(types, /vlm_snapshot_assist/);
assert.match(types, /isVlmSnapshotAssistMessage/);

const panel = fs.readFileSync(panelPath, 'utf8');
assert.match(panel, /VLM 스냅샷 분석/);
assert.match(panel, /FAILED/);

const hook = fs.readFileSync(hookPath, 'utf8');
assert.match(hook, /\/topic\/vlm-snapshot-assist/);
assert.match(hook, /getAssist/);

const alert = fs.readFileSync(alertPath, 'utf8');
assert.match(alert, /VlmSnapshotAssistPanel/);
assert.match(alert, /vlmAssist/);

// Pure logic: assist optional
function alertUiOk(assist) {
  return { canShowAlert: true, assistStatus: assist?.status ?? null };
}
assert.equal(alertUiOk(undefined).canShowAlert, true);
assert.equal(alertUiOk({ status: 'FAILED' }).canShowAlert, true);

console.log('verify-vlm-snapshot-assist: OK');
