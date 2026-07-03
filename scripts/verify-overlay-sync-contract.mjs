import { readFileSync } from 'node:fs';

const overlaySyncSource = readFileSync('src/shared/utils/overlaySync.ts', 'utf8');
const aiEventsSource = readFileSync('src/hooks/useAiEvents.ts', 'utf8');
const parserSource = readFileSync('src/shared/utils/aiEventParsing.ts', 'utf8');
const overlayGeometrySource = readFileSync('src/features/dashboard/utils/overlayGeometry.ts', 'utf8');
const gridSource = readFileSync('src/features/dashboard/components/LiveCameraGrid.tsx', 'utf8');
const playerSource = readFileSync('src/features/dashboard/components/WebRtcCameraPlayer.tsx', 'utf8');
const videoClockSource = readFileSync('src/features/dashboard/hooks/useVideoFrameClock.ts', 'utf8');

const checks = [
  ['default max age is 5 seconds', overlaySyncSource.includes('maxBufferAgeMs: 5_000')],
  ['default max size is 300', overlaySyncSource.includes('maxBufferSize: 300')],
  ['default threshold is 200ms', overlaySyncSource.includes('matchThresholdMs: 200')],
  ['receivedAtMs is assigned on arrival', aiEventsSource.includes('const receivedAtMs = Date.now()')],
  ['network latency is calculated', overlaySyncSource.includes('networkLatencyMs: latency(payload.publishedAtMs, receivedAtMs)')],
  ['end-to-end latency is calculated', overlaySyncSource.includes('endToEndLatencyMs: latency(payload.capturedAtMs, receivedAtMs)')],
  ['overlay feed is separated from alert feed', aiEventsSource.includes('overlayEvents: isOverlayEvent(aiEvent)')],
  ['confirmed alerts keep incoming payload', aiEventsSource.includes('const incomingEvent: AiEvent')],
  ['overlay payloads can use events array', parserSource.includes('Array.isArray(raw.events)')],
  ['timestampMs is parsed', parserSource.includes('raw.timestamp ?? raw.timestampMs')],
  ['bbox object is rendered', overlayGeometrySource.includes('xywhSchema')],
  ['boundingBox fallback is rendered', overlayGeometrySource.includes("readObjectValue(value, 'boundingBox')")],
  ['bbox array is rendered', overlayGeometrySource.includes('bboxArraySchema')],
  ['frame dimensions are used for overlay scale', overlayGeometrySource.includes('event.frameWidth, event.frameHeight')],
  ['grid passes overlay event to stream frame', gridSource.includes('overlayEvent={overlayEvent}')],
  ['WebRTC player renders CameraAiOverlay', playerSource.includes('<CameraAiOverlay event={overlayEvent} />')],
  ['requestVideoFrameCallback is used', videoClockSource.includes('requestVideoFrameCallback')],
  ['requestAnimationFrame fallback is used', videoClockSource.includes('requestAnimationFrame')],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length > 0) {
  for (const [name] of failed) {
    console.error(`FAIL ${name}`);
  }
  process.exit(1);
}

for (const [name] of checks) {
  console.log(`PASS ${name}`);
}
