import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const contractSource = readFileSync('src/features/dashboard/api/semanticSearch.ts', 'utf8');
const panelSource = readFileSync('src/features/dashboard/components/SemanticEventSearchPanel.tsx', 'utf8');
const apiSource = readFileSync('src/features/dashboard/api/alertEventsApi.ts', 'utf8');
const historySource = readFileSync('src/features/dashboard/components/DashboardHistoryView.tsx', 'utf8');
const dashboardSource = readFileSync('src/features/dashboard/pages/UserDashboard.tsx', 'utf8');
const compiled = ts.transpileModule(contractSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const contract = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const validResult = {
  alertEventId: 12,
  cameraId: 34,
  cameraLoginId: 'hallway-01',
  scenarioType: 'FALL_DETECTED',
  severity: 'HIGH',
  detectedAt: '2026-07-15T03:00:00.000Z',
  vlmDescription: '복도에서 작업자가 쓰러짐',
  vlmJson: '{}',
  similarityScore: 0.84,
  keyframeUrls: ['https://preview.example.test/deidentified/12.jpg'],
  snapshotUrl: 'https://preview.example.test/snapshots/12.jpg',
};

const facilityPath = contract.buildSemanticSearchPath(
  { type: 'facility', id: 7 },
  '  노란 안전모 & 낙상  ',
  { cameraId: 34, dateFrom: '2026-07-01T00:00:00Z', dateTo: '2026-07-15T00:00:00Z' },
);
const facilityUrl = new URL(facilityPath, 'https://frontend.test');
assert.equal(facilityUrl.pathname, '/api/facilities/7/search/semantic');
assert.equal(facilityUrl.searchParams.get('query'), '노란 안전모 & 낙상');
assert.equal(facilityUrl.searchParams.get('cameraId'), '34');
assert.equal(facilityUrl.searchParams.get('dateFrom'), '2026-07-01T00:00:00.000Z');
assert.equal(facilityUrl.searchParams.get('dateTo'), '2026-07-15T00:00:00.000Z');
assert.equal(facilityUrl.searchParams.get('topK'), '10');
assert.equal(facilityUrl.searchParams.get('minSimilarity'), '0.1');
assert.equal(facilityUrl.searchParams.get('excludeMock'), 'true');
console.log('PASS facility URL, encoding, numeric camera, dates and defaults');

const companyPath = contract.buildSemanticSearchPath(
  { type: 'company', id: '42' },
  '출입 제한 구역',
  { topK: 50, minSimilarity: 0, excludeMock: false },
);
assert.equal(new URL(companyPath, 'https://frontend.test').pathname, '/api/companies/42/search/semantic');
console.log('PASS company URL and explicit similarity bounds');

assert.equal(contract.normalizeSemanticCameraId('전체', '전체'), undefined);
assert.equal(contract.normalizeSemanticCameraId('camera-login-id', '전체'), undefined);
assert.equal(contract.normalizeSemanticCameraId('34', '전체'), 34);
assert.throws(() => contract.buildSemanticSearchPath({ type: 'facility', id: 0 }, 'query'));
assert.throws(() => contract.buildSemanticSearchPath({ type: 'company', id: 'abc' }, 'query'));
assert.throws(() => contract.buildSemanticSearchPath({ type: 'facility', id: 1 }, 'query', { minSimilarity: 1.01 }));
assert.throws(() => contract.buildSemanticSearchPath({ type: 'facility', id: 1 }, 'query', { topK: 51 }));
console.log('PASS invalid scopes, all-camera omission and input bounds');

assert.deepEqual(contract.parseSemanticSearchResponse([validResult]), [validResult]);
assert.throws(() => contract.parseSemanticSearchResponse({ content: [] }));
const malformed = [
  { ...validResult, alertEventId: Number.NaN },
  { ...validResult, cameraId: Infinity },
  { ...validResult, cameraLoginId: ' ' },
  { ...validResult, detectedAt: 'not-a-date' },
  { ...validResult, similarityScore: -0.01 },
  { ...validResult, similarityScore: 1.01 },
  { ...validResult, keyframeUrls: 'https://preview.example.test/1.jpg' },
  { ...validResult, keyframeUrls: ['file:///private/original.jpg'] },
  { ...validResult, keyframeUrls: ['https://user:secret@preview.example.test/1.jpg'] },
];
assert.deepEqual(contract.parseSemanticSearchResponse(malformed), []);
console.log('PASS malformed response, similarity and preview URL validation');

const duplicate = { ...validResult, vlmDescription: '다른 중복 설명' };
const cameraTwo = { ...validResult, alertEventId: 13, cameraId: 2, cameraLoginId: 'ward-02', vlmDescription: '병실 주변 배회' };
const oldResult = { ...validResult, alertEventId: 14, detectedAt: '2026-06-01T00:00:00.000Z' };
const mockFilters = {
  cameraId: 34,
  dateFrom: '2026-07-01T00:00:00.000Z',
  dateTo: '2026-07-16T00:00:00.000Z',
  minSimilarity: 0.1,
  topK: 1,
};
const firstMock = contract.filterSemanticMockResults([validResult, duplicate, cameraTwo, oldResult], '작업자 쓰러짐', mockFilters);
const secondMock = contract.filterSemanticMockResults([validResult, duplicate, cameraTwo, oldResult], '작업자 쓰러짐', mockFilters);
assert.deepEqual(firstMock, secondMock);
assert.equal(firstMock.length, 1);
assert.equal(firstMock[0].alertEventId, validResult.alertEventId);
assert.equal(contract.filterSemanticMockResults([validResult], '전혀없는검색', { minSimilarity: 0.1 }).length, 0);
console.log('PASS deterministic mock matching, filtering, deduplication and topK');

const sourceChecks = [
  ['stale requests are aborted', panelSource.includes('activeRequestRef.current?.controller.abort()')],
  ['sequence guard protects state', panelSource.includes('requestSequenceRef.current === sequence')],
  ['unmount blocks updates', panelSource.includes('mountedRef.current = false')],
  ['duplicate requests are ignored', panelSource.includes("activeRequestRef.current?.key === requestKey")],
  ['empty previews have a safe state', panelSource.includes('비식별 미리보기가 없습니다.')],
  ['failed images are removed', panelSource.includes('onError={() => setFailedImages')],
  ['privacy-neutral alt text is present', panelSource.includes('alt="비식별 처리된 사고 미리보기"')],
  ['auth state is handled', panelSource.includes('error.status === 401')],
  ['permission state is handled', panelSource.includes('error.status === 403')],
  ['server state is handled', panelSource.includes('error.status >= 500')],
  ['backend-not-ready state is handled', panelSource.includes('error.status === 404 || error.status === 501')],
  ['mock is development-only', apiSource.includes("import.meta.env.DEV && import.meta.env.VITE_VLM_MOCK_SEARCH === 'true'")],
  ['panel always defaults excludeMock true (not PROD-only)', panelSource.includes('excludeMock: includeTestData ? false : true')],
  ['dashboard passes date filter', historySource.includes('datePeriod={searchDate}')],
  ['dashboard passes incident flow', historySource.includes('onOpenIncident={onOpenIncident}')],
  ['dashboard builds explicit scope', dashboardSource.includes("type: userType === 'corporate' ? 'company' : 'facility'")],
  ['full VLM JSON is not rendered', !panelSource.includes('{result.vlmJson}')],
  ['snapshot preview is passed without original clip fallback', panelSource.includes('snapshotUrl: result.snapshotUrl') && !panelSource.includes('clipUrl: result.')],
  ['panel passes primarySnapshotUrl (not clip) to openIncident', panelSource.includes('primarySnapshotUrl: result.snapshotUrl') && !panelSource.includes('clipUrl: result.')],
];

for (const [name, passed] of sourceChecks) {
  assert.equal(passed, true, name);
  console.log(`PASS ${name}`);
}
