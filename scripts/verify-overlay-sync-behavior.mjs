import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const moduleDir = mkdtempSync(join(process.cwd(), '.overlay-sync-'));
writeTranspiledModule('src/shared/utils/overlaySync.ts', 'overlaySync.mjs');
writeTranspiledModule('src/features/dashboard/utils/overlayGeometry.ts', 'overlayGeometry.mjs');
writeTranspiledModule('src/shared/utils/aiEventParsing.ts', 'aiEventParsing.mjs', {
  './logger': './logger.mjs',
  './aiEventTypes': './aiEventTypes.mjs',
});
writeFileSync(join(moduleDir, 'logger.mjs'), 'export const logger = { warn() {}, info() {}, error() {} };');
writeFileSync(join(moduleDir, 'aiEventTypes.mjs'), '');

const {
  OverlaySyncBuffer,
  cameraKey,
  enrichOverlayPayload,
  overlaySyncOptionsFromEnv,
} = await import(pathToFileUrl(join(moduleDir, 'overlaySync.mjs')));
const { parseOverlayBox, overlayBoxes } = await import(pathToFileUrl(join(moduleDir, 'overlayGeometry.mjs')));
const { parseToAiEvent } = await import(pathToFileUrl(join(moduleDir, 'aiEventParsing.mjs')));

function writeTranspiledModule(sourcePath, outputName, replacements = {}) {
  let source = readFileSync(sourcePath, 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    source = source.replaceAll(`from '${from}'`, `from '${to}'`);
    source = source.replaceAll(`from "${from}"`, `from "${to}"`);
  }
  const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
}).outputText;
  writeFileSync(join(moduleDir, outputName), transpiled);
}

function pathToFileUrl(path) {
  return `file:///${path.replaceAll('\\', '/')}`;
}

const checks = [];

function check(name, passed) {
  checks.push([name, Boolean(passed)]);
}

const options = {
  overlayDelayMs: 300,
  maxBufferAgeMs: 5_000,
  maxBufferSize: 3,
  matchThresholdMs: 200,
};

const firstPayload = {
  camera_id: 'CAM_01',
  frameId: 10,
  capturedAtMs: 1_000,
  publishedAtMs: 1_200,
};
const enriched = enrichOverlayPayload(firstPayload, 1_500);
check('receivedAtMs is added', enriched.receivedAtMs === 1_500);
check('network latency is calculated from publishedAtMs', enriched.networkLatencyMs === 300);
check('end-to-end latency is calculated from capturedAtMs', enriched.endToEndLatencyMs === 500);
check('snake camera key is normalized', cameraKey(enriched) === 'cam_01');

const buffer = new OverlaySyncBuffer(options);
const selection = buffer.push(enriched, 1_500);
check('push returns selected event', selection.event.frameId === 10);
check('timestamp delta uses delay target', selection.event.overlayTimestampDeltaMs === 200);
check('selection warning respects threshold equality', selection.warning === false);

buffer.push({
  cameraLoginId: 'cam_01',
  frameId: 20,
  capturedAtMs: 1_250,
  publishedAtMs: 1_300,
  receivedAtMs: 1_550,
}, 1_550);
buffer.push({
  cameraLoginId: 'cam_01',
  frameId: 30,
  capturedAtMs: 1_900,
  publishedAtMs: 1_950,
  receivedAtMs: 2_200,
}, 2_200);

const frameSelection = buffer.select('cam_01', 2_200, 22);
check('frame id nearest match is preferred', frameSelection.event.frameId === 20);

const timeSelection = buffer.select('cam_01', 2_200);
check('timestamp fallback selects nearest delayed payload', timeSelection.event.frameId === 30);

buffer.push({
  cameraLoginId: 'cam_01',
  frameId: 40,
  capturedAtMs: 2_100,
  receivedAtMs: 2_400,
}, 2_400);
buffer.push({
  cameraLoginId: 'cam_01',
  frameId: 50,
  capturedAtMs: 2_200,
  receivedAtMs: 2_500,
}, 2_500);
check('buffer max size is enforced', buffer.size('cam_01') === 3);

const staleBuffer = new OverlaySyncBuffer(options);
staleBuffer.push({
  cameraLoginId: 'cam_02',
  frameId: 1,
  capturedAtMs: 100,
  receivedAtMs: 100,
}, 100);
staleBuffer.push({
  cameraLoginId: 'cam_02',
  frameId: 2,
  capturedAtMs: 5_200,
  receivedAtMs: 5_200,
}, 5_200);
check('stale payloads are pruned by age', staleBuffer.size('cam_02') === 1);

const envOptions = overlaySyncOptionsFromEnv({
  VITE_FRONT_OVERLAY_DELAY_MS: '450',
  VITE_FRONT_OVERLAY_MAX_BUFFER_AGE_MS: '7000',
  VITE_FRONT_OVERLAY_MAX_BUFFER_SIZE: '123',
  VITE_FRONT_OVERLAY_MATCH_THRESHOLD_MS: '180',
});
check('env overlay delay is parsed', envOptions.overlayDelayMs === 450);
check('env max age is parsed', envOptions.maxBufferAgeMs === 7_000);
check('env max size is parsed', envOptions.maxBufferSize === 123);
check('env threshold is parsed', envOptions.matchThresholdMs === 180);

const overlayEvent = parseToAiEvent({
  messageType: 'overlay',
  cameraLoginId: 'cam_03',
  timestampMs: 10_000,
  frameId: 77,
  frameWidth: 640,
  frameHeight: 480,
  capturedAtMs: 9_900,
  publishedAtMs: 10_050,
  events: [{ bbox: { x: 64, y: 48, width: 128, height: 96 }, frameId: 77 }],
});
check('overlay payload parses message type', overlayEvent?.messageType === 'overlay');
check('overlay payload parses timestampMs', overlayEvent?.timestamp === 10_000);
check('overlay payload parses events as boxes', overlayEvent?.boxes.length === 1);
check('overlay payload parses frame dimensions', overlayEvent?.frameWidth === 640 && overlayEvent.frameHeight === 480);

const confirmedEvent = parseToAiEvent({
  messageType: 'event',
  camera_login_id: 'cam_04',
  timestamp: 11,
  type: 'faint',
  trackingId: 9,
  sequence: {
    sequence_start_frame_id: 10,
    sequence_end_frame_id: 39,
    sequence_start_at_ms: 1_000,
    sequence_end_at_ms: 2_000,
  },
});
check('confirmed event parses trackingId fallback', confirmedEvent?.track_id === '9');
check('sequence frame range is parsed', confirmedEvent?.sequence?.sequenceStartFrameId === 10 && confirmedEvent.sequence.sequenceEndFrameId === 39);
check('sequence timestamp range is parsed', confirmedEvent?.sequence?.sequenceStartAtMs === 1_000 && confirmedEvent.sequence.sequenceEndAtMs === 2_000);

const xywhBox = parseOverlayBox({ x: 64, y: 48, width: 128, height: 96 }, 640, 480);
check('xywh bbox normalizes to percent', xywhBox?.leftPct === 10 && xywhBox.topPct === 10 && xywhBox.widthPct === 20 && xywhBox.heightPct === 20);

const boundingBox = parseOverlayBox({ boundingBox: { x: 320, y: 240, width: 640, height: 480 } }, 1_280, 960);
check('boundingBox nested shape normalizes', boundingBox?.leftPct === 25 && boundingBox.topPct === 25 && boundingBox.widthPct === 50 && boundingBox.heightPct === 50);

const arrayBox = parseOverlayBox([10, 20, 30, 60], 100, 100);
check('array xyxy bbox normalizes', arrayBox?.leftPct === 10 && arrayBox.topPct === 20 && arrayBox.widthPct === 20 && arrayBox.heightPct === 40);

const eventBoxes = overlayBoxes({
  camera_id: 'cam_05',
  frame_idx: 0,
  frameWidth: 200,
  frameHeight: 100,
  timestamp: 1,
  event_type: 'overlay',
  score: 0,
  confidence: 0,
  bbox: [0, 0, 20, 20],
  boxes: [{ bbox: { x: 100, y: 50, width: 50, height: 25 } }],
  threshold: 0,
  track_id: null,
  severity: 'HIGH',
});
check('overlayBoxes combines event bbox and boxes', eventBoxes.length === 2);

const failed = checks.filter(([, passed]) => !passed);
if (failed.length > 0) {
  rmSync(moduleDir, { recursive: true, force: true });
  for (const [name] of failed) {
    console.error(`FAIL ${name}`);
  }
  process.exit(1);
}

for (const [name] of checks) {
  console.log(`PASS ${name}`);
}
rmSync(moduleDir, { recursive: true, force: true });
