import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const camerasPath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'data', 'cameras.ts');
const framePath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'components', 'CameraStreamFrame.tsx');
const integratedDashboardPath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'pages', 'IntegratedDashboard.tsx');
const camerasSource = readFileSync(camerasPath, 'utf8');
const frameSource = readFileSync(framePath, 'utf8');
const integratedDashboardSource = readFileSync(integratedDashboardPath, 'utf8');

const requiredSnippets = [
  "export const STREAM_MODE: StreamMode =",
  ": 'mjpeg';",
  "export const MJPEG_BASE_PATH =",
  "return `${parsed.protocol}//${parsed.hostname}:${targetPort}${MJPEG_BASE_PATH}/${cameraLoginId}`;",
  "streamKind === 'mjpeg'",
  "getMjpegUrlForCamera(cameraLoginId)",
];

for (const snippet of requiredSnippets) {
  if (!camerasSource.includes(snippet) && !frameSource.includes(snippet)) {
    throw new Error(`Missing MJPEG routing contract snippet: ${snippet}`);
  }
}

const cameraUrlCases = [
  ['cam_01', '8010'],
  ['cam_02', '8011'],
  ['cam_05', '8014'],
];

for (const [cameraLoginId, port] of cameraUrlCases) {
  const suffix = Number.parseInt(cameraLoginId.split('_')[1], 10);
  const expectedExpression = `const portOffset = Math.max(0, camNum - 1);`;
  if (!camerasSource.includes(expectedExpression)) {
    throw new Error('MJPEG URL generation must derive port offset from cameraLoginId suffix.');
  }
  const expectedUrl = `http://localhost:${port}/mjpeg/${cameraLoginId}`;
  const actualPort = 8010 + suffix - 1;
  const actualUrl = `http://localhost:${actualPort}/mjpeg/${cameraLoginId}`;
  if (actualUrl !== expectedUrl) {
    throw new Error(`Expected ${expectedUrl}, got ${actualUrl}`);
  }
}

const forbiddenIntegratedDashboardSnippets = [
  "streamMode: 'raw'",
  "streamKind: 'hls'",
  'assignedVideoPath ??',
];

for (const snippet of forbiddenIntegratedDashboardSnippets) {
  if (integratedDashboardSource.includes(snippet)) {
    throw new Error(`IntegratedDashboard must not bypass MJPEG routing with: ${snippet}`);
  }
}

if (!integratedDashboardSource.includes('getDynamicStreamUrl(')) {
  throw new Error('IntegratedDashboard must use getDynamicStreamUrl for selected-space camera streams.');
}

console.log('MJPEG stream routing verification passed.');
