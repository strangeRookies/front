import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Save, RotateCcw } from 'lucide-react';
import {
  type NormalizedPoint,
  type RoiConfigResponse,
  type RoiGroupId,
  type ScenarioResponse,
  ROI_GROUPS,
  createRoiConfig,
  deleteRoiConfig,
  deserializePolygon,
  fetchRoiConfigs,
  fetchScenarios,
  serializePolygon,
  updateRoiConfig,
} from '../api/roiApi';
import { HLS_BASE_URL } from '../data/cameras';
import { CameraStreamFrame } from './CameraStreamFrame';

interface RoiEditorModalProps {
  cameraDbId: number;
  cameraName: string;
  cameraLoginId: string;
  onClose: () => void;
}

const COLORS = [
  'rgba(59,130,246,0.35)',
  'rgba(234,179,8,0.35)',
  'rgba(239,68,68,0.35)',
  'rgba(34,197,94,0.35)',
  'rgba(168,85,247,0.35)',
];
const STROKE_COLORS = [
  'rgba(59,130,246,0.9)',
  'rgba(234,179,8,0.9)',
  'rgba(239,68,68,0.9)',
  'rgba(34,197,94,0.9)',
  'rgba(168,85,247,0.9)',
];
const POINT_HIT_RADIUS = 10;

function scenarioIdsForGroup(groupId: RoiGroupId, scenarios: ScenarioResponse[]): number[] {
  const group = ROI_GROUPS.find(g => g.groupId === groupId);
  if (!group) return [];
  const types: readonly string[] = group.scenarioTypes;
  return scenarios.filter(s => types.includes(s.scenarioType)).map(s => s.scenarioId);
}

export function RoiEditorModal({ cameraDbId, cameraName, cameraLoginId, onClose }: RoiEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([]);
  const [existingRois, setExistingRois] = useState<RoiConfigResponse[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<RoiGroupId | null>(null);
  const [points, setPoints] = useState<NormalizedPoint[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<NormalizedPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HLS raw stream URL (MediaMTX) — AI 오버레이 없는 원본 영상
  const hlsUrl = `${HLS_BASE_URL}/${cameraLoginId}/index.m3u8`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [scenariosData, roisData] = await Promise.all([
          fetchScenarios(),
          fetchRoiConfigs(cameraDbId),
        ]);
        if (cancelled) return;
        setScenarios(scenariosData);
        setExistingRois(roisData.filter(r => r.isActive));
        setSelectedGroupId(ROI_GROUPS[0].groupId);
      } catch {
        if (!cancelled) setError('데이터 불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [cameraDbId]);

  useEffect(() => {
    if (selectedGroupId === null) return;
    const ids = scenarioIdsForGroup(selectedGroupId, scenarios);
    const existing = existingRois.find(r => ids.includes(r.scenarioId));
    setPoints(existing ? deserializePolygon(existing.polygonPoints) : []);
  }, [selectedGroupId, existingRois, scenarios]);

  // 캔버스 크기를 컨테이너에 동기화
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // 현재 편집 중인 폴리곤
    if (points.length > 0) {
      const colorIdx = ROI_GROUPS.findIndex(g => g.groupId === selectedGroupId) % COLORS.length;
      const idx = colorIdx < 0 ? 0 : colorIdx;
      ctx.beginPath();
      ctx.moveTo(points[0].x * width, points[0].y * height);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * width, points[i].y * height);
      }
      if (points.length >= 3) ctx.closePath();
      ctx.fillStyle = COLORS[idx];
      ctx.fill();
      ctx.strokeStyle = STROKE_COLORS[idx];
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        ctx.arc(points[i].x * width, points[i].y * height, 6, 0, Math.PI * 2);
        ctx.fillStyle = STROKE_COLORS[idx];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 러버밴드 가이드 선 (마우스 커서로 이어지는 미리보기 선)
      if (points.length > 0 && points.length < MAX_POINTS && hoverPos && draggingIdx === null) {
        ctx.beginPath();
        ctx.moveTo(points[points.length - 1].x * width, points[points.length - 1].y * height);
        ctx.lineTo(hoverPos.x * width, hoverPos.y * height);
        ctx.strokeStyle = STROKE_COLORS[idx];
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 다른 그룹 ROI 미리보기 (점선)
    const otherGroup = ROI_GROUPS.find(g => g.groupId !== selectedGroupId);
    if (otherGroup) {
      const otherIds = scenarioIdsForGroup(otherGroup.groupId, scenarios);
      const otherRoi = existingRois.find(r => otherIds.includes(r.scenarioId));
      const pts = otherRoi ? deserializePolygon(otherRoi.polygonPoints) : [];
      if (pts.length >= 3) {
        const otherColorIdx = ROI_GROUPS.findIndex(g => g.groupId === otherGroup.groupId) % COLORS.length;
        const idx = otherColorIdx < 0 ? 0 : otherColorIdx;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * width, pts[0].y * height);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * width, pts[i].y * height);
        ctx.closePath();
        ctx.fillStyle = COLORS[idx].replace('0.35', '0.1');
        ctx.fill();
        ctx.strokeStyle = STROKE_COLORS[idx].replace('0.9', '0.4');
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [points, existingRois, selectedGroupId, scenarios, hoverPos, draggingIdx]);

  // 컨테이너 크기 변화 감지 → 캔버스 리사이즈 → 리드로우
  useEffect(() => {
    syncCanvasSize();
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
      redraw();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [syncCanvasSize, redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  function toNormalized(e: React.MouseEvent<HTMLCanvasElement>): NormalizedPoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function nearestPointIdx(norm: NormalizedPoint, canvas: HTMLCanvasElement): number {
    let minDist = Infinity;
    let idx = -1;
    for (let i = 0; i < points.length; i++) {
      const dx = (points[i].x - norm.x) * canvas.width;
      const dy = (points[i].y - norm.y) * canvas.height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; idx = i; }
    }
    return minDist <= POINT_HIT_RADIUS ? idx : -1;
  }

  const MAX_POINTS = 5;

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    const norm = toNormalized(e);
    const hit = nearestPointIdx(norm, canvasRef.current!);
    if (hit >= 0) {
      setDraggingIdx(hit);
    } else if (points.length < MAX_POINTS) {
      setPoints(prev => [...prev, norm]);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const norm = toNormalized(e);
    setHoverPos(norm);
    if (draggingIdx === null) return;
    setPoints(prev => prev.map((p, i) => (i === draggingIdx ? norm : p)));
  }

  function handleMouseUp() { setDraggingIdx(null); }

  function handleMouseLeave() {
    setDraggingIdx(null);
    setHoverPos(null);
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const norm = toNormalized(e);
    const hit = nearestPointIdx(norm, canvasRef.current!);
    if (hit >= 0) setPoints(prev => prev.filter((_, i) => i !== hit));
  }

  async function handleSave() {
    if (selectedGroupId === null || points.length < 3) {
      setError('최소 3개 이상의 점이 필요합니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const polygonPoints = serializePolygon(points);
      const scenarioIds = scenarioIdsForGroup(selectedGroupId, scenarios);
      const saved = await Promise.all(
        scenarioIds.map(scenarioId => {
          const existing = existingRois.find(r => r.scenarioId === scenarioId);
          return existing
            ? updateRoiConfig(existing.roiConfigId, { polygonPoints })
            : createRoiConfig(cameraDbId, { scenarioId, polygonPoints });
        })
      );
      setExistingRois(prev => {
        const savedScenarioIds = new Set(saved.map(r => r.scenarioId));
        const filtered = prev.filter(r => !savedScenarioIds.has(r.scenarioId));
        return [...filtered, ...saved];
      });
    } catch {
      setError('저장 실패. 좌표 값이 0~1 범위를 벗어났을 수 있습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (selectedGroupId === null) return;
    const scenarioIds = scenarioIdsForGroup(selectedGroupId, scenarios);
    const existing = existingRois.filter(r => scenarioIds.includes(r.scenarioId));
    if (existing.length === 0) { setPoints([]); return; }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(existing.map(r => deleteRoiConfig(r.roiConfigId)));
      const deletedIds = new Set(existing.map(r => r.roiConfigId));
      setExistingRois(prev => prev.filter(r => !deletedIds.has(r.roiConfigId)));
      setPoints([]);
    } catch {
      setError('삭제 실패');
    } finally {
      setSaving(false);
    }
  }

  const selectedScenarioIds = selectedGroupId ? scenarioIdsForGroup(selectedGroupId, scenarios) : [];
  const hasExistingForSelected = existingRois.some(r => selectedScenarioIds.includes(r.scenarioId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-slate-700 bg-[#0a111f] p-6 shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white">ROI 설정</h2>
            <p className="text-xs text-slate-400">{cameraName} — 분석 영역을 지정하면 해당 영역만 AI가 감지합니다.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 그룹 탭 */}
        <div className="flex flex-wrap gap-2">
          {loading ? (
            <span className="text-xs text-slate-500">시나리오 불러오는 중...</span>
          ) : (
            ROI_GROUPS.map(group => {
              const groupScenarioIds = scenarioIdsForGroup(group.groupId, scenarios);
              const hasRoi = existingRois.some(r => groupScenarioIds.includes(r.scenarioId));
              const isSelected = group.groupId === selectedGroupId;
              return (
                <button
                  key={group.groupId}
                  onClick={() => { setSelectedGroupId(group.groupId); setError(null); }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors
                    ${isSelected
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                    }`}
                >
                  {group.label}
                  {hasRoi && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })
          )}
        </div>
        <p className="text-[11px] text-slate-500">낙상·쓰러짐·실신은 하나의 분석 영역을 공유합니다.</p>

        {/* 캔버스 에디터 */}
        <div
          ref={containerRef}
          className="relative aspect-video select-none overflow-hidden rounded-xl border border-slate-700 bg-black"
        >
          {/* HLS raw stream — AI 오버레이 없는 MediaMTX 원본 영상 */}
          <CameraStreamFrame
            streamUrl={hlsUrl}
            streamKind="hls"
            title={`${cameraName} live`}
            className="absolute inset-0 h-full w-full object-contain"
            cameraLoginId={cameraLoginId}
          />

          {/* ROI 편집 캔버스 */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* 안내 */}
        <p className="text-[11px] text-slate-500">
          클릭으로 점 추가 (최대 5개) &nbsp;·&nbsp; 드래그로 점 이동 &nbsp;·&nbsp; 우클릭으로 점 삭제 &nbsp;·&nbsp; 3개 이상 점이 있어야 저장 가능
        </p>

        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300">{error}</p>}

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPoints([])}
              disabled={points.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              초기화
            </button>
            {hasExistingForSelected && (
              <button
                onClick={() => void handleDelete()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-rose-700/60 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                ROI 삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              닫기
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || points.length < 3}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {hasExistingForSelected ? '수정 저장' : 'ROI 저장'}
            </button>
          </div>
        </div>

        {/* 저장된 ROI 목록 */}
        {existingRois.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">저장된 ROI</p>
            <div className="flex flex-wrap gap-2">
              {ROI_GROUPS.filter(group =>
                existingRois.some(r => scenarioIdsForGroup(group.groupId, scenarios).includes(r.scenarioId))
              ).map(group => (
                <div key={group.groupId} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {group.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
