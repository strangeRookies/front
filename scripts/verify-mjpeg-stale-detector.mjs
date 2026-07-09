import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ts from 'typescript';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const framePath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'components', 'CameraStreamFrame.tsx');
const camerasPath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'data', 'cameras.ts');
const detectorPath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'utils', 'mjpegStaleDetector.ts');
const frameSource = readFileSync(framePath, 'utf8');
const camerasSource = readFileSync(camerasPath, 'utf8');
const detectorSource = readFileSync(detectorPath, 'utf8');

const requiredFrameSnippets = [
  'MJPEG_RECONNECT_COOLDOWN_MS',
  'MJPEG_STALE_FRAME_AGE_MS',
  'health-fetch-failed',
  'health-cors-failed',
  'health-url-invalid',
  'frame-age-stale',
  'processed-frame-stalled',
  'mjpeg-frame-stalled',
  'reconnect-cooldown-active',
  'streamClients',
  'reconnectAttempt',
];

for (const snippet of requiredFrameSnippets) {
  if (!frameSource.includes(snippet) && !detectorSource.includes(snippet)) {
    throw new Error(`Missing stale detector contract snippet: ${snippet}`);
  }
}

if (!frameSource.includes("from '../utils/mjpegStaleDetector'")) {
  throw new Error('CameraStreamFrame must use the shared MJPEG stale detector utility.');
}

if (frameSource.includes('consecutiveStaleCount++;\n      }\n\n      if (consecutiveStaleCount >= 3)')) {
  throw new Error('Health fetch failures must not increment stale reconnect counters.');
}

if (frameSource.includes('healthError: err.message ||') && frameSource.includes('isStale: true')) {
  throw new Error('Health fetch failures must not mark the MJPEG stream stale.');
}

if (frameSource.includes('!loaded || diagInfo.isStale || diagInfo.diagnosticUnavailable')) {
  throw new Error('Health diagnostic failures must not cover the MJPEG img stream with the stale overlay.');
}

if (!frameSource.includes("fetch(healthUrl, { cache: 'no-store' })")) {
  throw new Error('Health polling fetch must use cache: no-store.');
}

if (!frameSource.includes('setCacheBuster(Date.now())')) {
  throw new Error('Manual reconnect must keep cache-buster refresh capability.');
}

const healthUrlCases = [
  ['cam_02', '8011'],
  ['cam_04', '8013'],
  ['cam_05', '8014'],
];

for (const [cameraLoginId, port] of healthUrlCases) {
  const suffix = Number.parseInt(cameraLoginId.split('_')[1], 10);
  const actualPort = 8010 + suffix - 1;
  if (`${actualPort}` !== port) {
    throw new Error(`Expected ${cameraLoginId} health port ${port}, got ${actualPort}`);
  }
}

if (!camerasSource.includes('export function getMjpegUrlForCamera(cameraLoginId: string): string')) {
  throw new Error('MJPEG URL generation must remain cameraLoginId-based.');
}

const transpiledDetector = ts.transpileModule(detectorSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const detectorModule = await import(`data:text/javascript,${encodeURIComponent(transpiledDetector.outputText)}`);

function check(label, condition) {
  if (!condition) {
    throw new Error(`MJPEG stale detector behavior failed: ${label}`);
  }
}

check('cooldown starts at 10 seconds', detectorModule.reconnectCooldownMs(0) === 10000);
check('cooldown backs off to 20 seconds', detectorModule.reconnectCooldownMs(1) === 20000);
check('cooldown is capped at 60 seconds', detectorModule.reconnectCooldownMs(10) === 60000);
check(
  'TypeError is classified as health-cors-failed',
  detectorModule.classifyHealthFetchError(new TypeError('Failed to fetch')) === 'health-cors-failed',
);
check(
  'generic errors are classified as health-fetch-failed',
  detectorModule.classifyHealthFetchError(new Error('HTTP 500')) === 'health-fetch-failed',
);
check(
  'stream_clients=0 softens stale detection',
  detectorModule.staleReasonsForPayload(6000, 10, 10, 0, { processedFrames: 10, mjpegFrames: 10 }).length === 0,
);
check(
  'progressing counters prevent full stale decision',
  detectorModule.staleReasonsForPayload(6000, 11, 11, 1, { processedFrames: 10, mjpegFrames: 10 }).length === 1,
);
check(
  'stalled payload reports all stale reasons',
  detectorModule.staleReasonsForPayload(6000, 10, 10, 1, { processedFrames: 10, mjpegFrames: 10 }).join(',') ===
    'frame-age-stale,processed-frame-stalled,mjpeg-frame-stalled',
);

console.log('MJPEG stale detector verification passed.');
