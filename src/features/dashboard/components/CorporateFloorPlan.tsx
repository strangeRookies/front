import { RefreshCw } from 'lucide-react';
import type { CorporateCameraResponse } from '../api/adminApi';

interface CorporateFloorPlanProps {
  cameras: CorporateCameraResponse[];
  selectedCameraId: string | null;
  onCameraSelect: (id: string) => void;
  onRefresh?: () => void;
}

// 20개 슬롯 — cameras[i] → SLOTS[i % SLOTS.length]
const SLOTS: { x: number; y: number }[] = [
  // 방 A — 좌상 (4개)
  { x: 100, y: 75 }, { x: 200, y: 75 }, { x: 100, y: 155 }, { x: 200, y: 155 },
  // 방 B — 우상 (4개)
  { x: 555, y: 75 }, { x: 660, y: 75 }, { x: 555, y: 155 }, { x: 660, y: 155 },
  // 방 C — 좌하 (4개)
  { x: 100, y: 295 }, { x: 200, y: 295 }, { x: 100, y: 375 }, { x: 200, y: 375 },
  // 방 D — 우하 (4개)
  { x: 555, y: 295 }, { x: 660, y: 295 }, { x: 555, y: 375 }, { x: 660, y: 375 },
  // 중앙 복도 (4개)
  { x: 390, y: 100 }, { x: 390, y: 190 }, { x: 390, y: 285 }, { x: 390, y: 375 },
];

function cameraColor(status: CorporateCameraResponse['connectionStatus']) {
  if (status === 'CONNECTED') return '#10b981';
  if (status === 'DISABLED') return '#475569';
  return '#ef4444';
}

function isAlert(status: CorporateCameraResponse['connectionStatus']) {
  return status !== 'CONNECTED' && status !== 'DISABLED';
}

export function CorporateFloorPlan({ cameras, selectedCameraId, onCameraSelect, onRefresh }: CorporateFloorPlanProps) {
  return (
    <div className="relative w-full h-full bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">기업 공간 도면 — 카메라 배치도</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />연결됨
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />이상
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              title="카메라 목록 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG 도면 */}
      <div className="flex-1 relative bg-white p-4 flex items-center justify-center overflow-hidden select-none">
        <svg className="w-full h-full max-h-[340px]" viewBox="0 0 780 420" fill="none">
          <defs>
            <pattern id="corp-grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* 외벽 */}
          <rect x="20" y="20" width="740" height="380" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" rx="6" />
          <rect x="22" y="22" width="736" height="376" fill="url(#corp-grid)" />

          {/* 중앙 가로 복도 분리벽 */}
          <line x1="20" y1="230" x2="760" y2="230" stroke="#94a3b8" strokeWidth="2.5" />

          {/* 상단 세로 분할 */}
          <line x1="310" y1="20" x2="310" y2="230" stroke="#94a3b8" strokeWidth="2.5" />
          <line x1="470" y1="20" x2="470" y2="230" stroke="#94a3b8" strokeWidth="2.5" />

          {/* 하단 세로 분할 */}
          <line x1="310" y1="230" x2="310" y2="400" stroke="#94a3b8" strokeWidth="2.5" />
          <line x1="470" y1="230" x2="470" y2="400" stroke="#94a3b8" strokeWidth="2.5" />

          {/* 문 표시 */}
          <path d="M 260 230 A 40 40 0 0 0 310 190" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 520 230 A 40 40 0 0 1 470 190" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 260 400 A 40 40 0 0 1 310 360" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 520 400 A 40 40 0 0 0 470 360" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* 카메라 아이콘 */}
          {cameras.map((cam, i) => {
            const slot = SLOTS[i % SLOTS.length];
            const id = String(cam.cameraId);
            const isSelected = selectedCameraId === id;
            const alert = isAlert(cam.connectionStatus);
            const fill = cameraColor(cam.connectionStatus);

            return (
              <g
                key={cam.cameraId}
                onClick={() => onCameraSelect(id)}
                className="cursor-pointer"
              >
                {/* 이상 시 펄스 */}
                {alert && (
                  <>
                    <circle cx={slot.x} cy={slot.y} r="36" fill="#ef4444" opacity="0.12"
                      className="animate-ping"
                      style={{ transformOrigin: `${slot.x}px ${slot.y}px`, animationDuration: '2s' }} />
                    <circle cx={slot.x} cy={slot.y} r="24" fill="#ef4444" opacity="0.20"
                      className="animate-pulse"
                      style={{ transformOrigin: `${slot.x}px ${slot.y}px` }} />
                  </>
                )}

                {/* 선택 글로우 */}
                {isSelected && (
                  <circle cx={slot.x} cy={slot.y} r="22" fill="none"
                    stroke="#3b82f6" strokeWidth="2.5" className="animate-pulse"
                    style={{ transformOrigin: `${slot.x}px ${slot.y}px` }} />
                )}

                {/* 코어 원 */}
                <circle cx={slot.x} cy={slot.y} r="16"
                  fill={fill}
                  stroke={isSelected ? '#3b82f6' : alert ? '#dc2626' : '#059669'}
                  strokeWidth="2"
                />

                {/* 카메라 아이콘 path */}
                <g transform={`translate(${slot.x - 7}, ${slot.y - 7})`}>
                  <path
                    d="M11.5 3.8v6.4L8.5 8.4V5.8l3-2zM1.5 3.7h5.8c.4 0 .7.3.7.7v5.2c0 .4-.3.7-.7.7H1.5c-.4 0-.7-.3-.7-.7V4.4c0-.4.3-.7.7-.7z"
                    fill="#ffffff"
                  />
                </g>

                {/* 카메라명 */}
                <text
                  x={slot.x}
                  y={slot.y + 28}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="9"
                  fontWeight="700"
                >
                  {cam.cameraName.length > 10 ? cam.cameraName.slice(0, 9) + '…' : cam.cameraName}
                </text>

                {/* 설치 위치 */}
                {cam.locationDescription && (
                  <text
                    x={slot.x}
                    y={slot.y + 39}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8"
                  >
                    {cam.locationDescription.length > 12
                      ? cam.locationDescription.slice(0, 11) + '…'
                      : cam.locationDescription}
                  </text>
                )}
              </g>
            );
          })}

          {/* 카메라 없을 때 */}
          {cameras.length === 0 && (
            <text x="390" y="215" textAnchor="middle" fill="#94a3b8" fontSize="14">
              등록된 카메라가 없습니다
            </text>
          )}
        </svg>

        {/* 우측 하단 카메라 수 뱃지 */}
        <div className="absolute bottom-3 right-4 bg-white/90 border border-slate-300 rounded-lg px-3 py-1.5 text-[10px] text-slate-600 font-semibold">
          총 {cameras.length}대
        </div>
      </div>
    </div>
  );
}
