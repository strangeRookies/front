import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const framePath = join(scriptDir, '..', 'src', 'features', 'dashboard', 'components', 'CameraStreamFrame.tsx');
const frameSource = readFileSync(framePath, 'utf8');

const expectedResolver =
  "streamKind === 'mjpeg' && (STREAM_MODE === 'overlay' || STREAM_MODE === 'mjpeg') && !!derivedLoginId";
const expectedFallbackGuard = 'shouldResolveOverlay ? overlayUrl : streamUrl';

if (!frameSource.includes(expectedResolver)) {
  throw new Error(
    'CameraStreamFrame must resolve backend ai-overlay registry URLs in both overlay and mjpeg modes.',
  );
}

if (!frameSource.includes(expectedFallbackGuard)) {
  throw new Error('CameraStreamFrame must wait for registry overlayUrl before using the MJPEG image source.');
}

console.log('MJPEG stream routing verification passed.');
