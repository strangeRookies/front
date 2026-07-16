import { RefreshCw } from 'lucide-react';
import type { CorporateCameraResponse } from '../api/adminApi';

interface CorporateFloorPlanProps {
  cameras: CorporateCameraResponse[];
  selectedCameraId: string | null;
  onCameraSelect: (id: string) => void;
  onRefresh?: () => void;
}

const VIEWBOX_WIDTH = 780;
const VIEWBOX_HEIGHT = 420;

const ZONES = [
  { name: 'A구역', x: 20, y: 20, width: 230, height: 380, color: '#3b82f6' },
  { name: 'B구역', x: 265, y: 20, width: 245, height: 380, color: '#22c55e' },
  { name: 'C구역', x: 525, y: 20, width: 235, height: 380, color: '#f87171' },
];

// 카메라별 실제 x,y 비율(0~1, 도면 전체 기준 정규화) 데이터가 아직 DB/API에 없어서
// 임시로 결정론적 슬롯을 구역별로 순환 배정한다. 나중에 카메라 위치 저장 기능이
// 생기면 normalizedPositionFor()만 cam.positionXRatio/positionYRatio를 읽도록
// 바꾸면 되고, 아래 toSvgPoint() 변환 로직은 그대로 재사용 가능.
const DEFAULT_POSITION_RATIOS: { x: number; y: number }[] = [
  // A구역 8슬롯
  { x: 0.09, y: 0.14 }, { x: 0.21, y: 0.14 }, { x: 0.09, y: 0.36 }, { x: 0.21, y: 0.36 },
  { x: 0.09, y: 0.58 }, { x: 0.21, y: 0.58 }, { x: 0.09, y: 0.80 }, { x: 0.21, y: 0.80 },
  // B구역 8슬롯
  { x: 0.42, y: 0.14 }, { x: 0.55, y: 0.14 }, { x: 0.42, y: 0.36 }, { x: 0.55, y: 0.36 },
  { x: 0.42, y: 0.58 }, { x: 0.55, y: 0.58 }, { x: 0.42, y: 0.80 }, { x: 0.55, y: 0.80 },
  // C구역 8슬롯
  { x: 0.75, y: 0.14 }, { x: 0.88, y: 0.14 }, { x: 0.75, y: 0.36 }, { x: 0.88, y: 0.36 },
  { x: 0.75, y: 0.58 }, { x: 0.88, y: 0.58 }, { x: 0.75, y: 0.80 }, { x: 0.88, y: 0.80 },
];

function normalizedPositionFor(_cam: CorporateCameraResponse, index: number): { x: number; y: number } {
  return DEFAULT_POSITION_RATIOS[index % DEFAULT_POSITION_RATIOS.length];
}

function toSvgPoint(ratio: { x: number; y: number }): { x: number; y: number } {
  return { x: ratio.x * VIEWBOX_WIDTH, y: ratio.y * VIEWBOX_HEIGHT };
}

const NORMAL_COLOR = '#1d9e75';
const ALERT_COLOR = '#e24b4a';
const DOT_RADIUS = 7;

function isAlert(status: CorporateCameraResponse['connectionStatus']) {
  return status !== 'CONNECTED' && status !== 'DISABLED';
}

function connectionStatusLabel(status: CorporateCameraResponse['connectionStatus']) {
  switch (status) {
    case 'DISCONNECTED': return '연결 끊김';
    case 'RECONNECTING': return '재연결 중';
    case 'ERROR': return '연결 오류';
    case 'UNKNOWN': return '상태 확인 중';
    default: return '연결 이상';
  }
}

export function CorporateFloorPlan({
  cameras,
  selectedCameraId,
  onCameraSelect,
  onRefresh,
}: CorporateFloorPlanProps) {
  const hasActiveAlert = cameras.some((cam) => isAlert(cam.connectionStatus));

  return (
    <div className="relative w-full h-full bg-white border border-[#e5e7eb] rounded-xl overflow-hidden flex flex-col">
      <style>{`
        @keyframes floorplan-camera-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0.4; }
        }
        .floorplan-camera-pulse {
          animation: floorplan-camera-pulse 1.6s ease-in-out infinite alternate;
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#fafafa] border-b border-[#e5e7eb] flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700">기업 공간 도면 — 카메라 배치도</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1d9e75]/10 text-[#127a5a] border border-[#1d9e75]/20 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d9e75]" />연결됨
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#e24b4a]/10 text-[#c23433] border border-[#e24b4a]/20 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full bg-[#e24b4a] ${hasActiveAlert ? 'animate-pulse' : ''}`} />이상
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              title="카메라 목록 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG 도면 */}
      <div className="flex-1 relative bg-[#fafafa] p-4 flex items-center justify-center overflow-hidden select-none">
        <svg className="w-full h-full max-h-[340px]" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} fill="none">
          {/* 패널 배경 */}
          <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#ffffff" />

          {/* 구역 배경 + 경계선 + 이름 */}
          {ZONES.map((zone) => (
            <g key={zone.name}>
              <rect
                x={zone.x} y={zone.y} width={zone.width} height={zone.height}
                fill={zone.color} opacity="0.11"
                stroke="#e2e8f0" strokeWidth="1.5" rx="6"
              />
              <text x={zone.x + 12} y={zone.y + 20} fill="#4b5563" fontSize="11" fontWeight="700">
                {zone.name}
              </text>
            </g>
          ))}

          {/* 카메라 마커 */}
          {cameras.map((cam, i) => {
            const id = String(cam.cameraId);
            const isSelected = selectedCameraId === id;
            const alert = isAlert(cam.connectionStatus);
            const point = toSvgPoint(normalizedPositionFor(cam, i));
            const color = alert ? ALERT_COLOR : NORMAL_COLOR;
            const labelBase = cam.cameraName.length > 10 ? cam.cameraName.slice(0, 9) + '…' : cam.cameraName;
            const label = alert ? `${labelBase} · ${connectionStatusLabel(cam.connectionStatus)}` : labelBase;

            return (
              <g
                key={cam.cameraId}
                onClick={() => onCameraSelect(id)}
                className="cursor-pointer"
              >
                {/* 정상: 옅은 글로우(고정) / 이상: 펄스 애니메이션 */}
                {alert ? (
                  <circle
                    cx={point.x} cy={point.y} r={DOT_RADIUS}
                    fill={ALERT_COLOR}
                    className="floorplan-camera-pulse"
                  />
                ) : (
                  <circle cx={point.x} cy={point.y} r={DOT_RADIUS * 2} fill={NORMAL_COLOR} opacity="0.18" />
                )}

                {/* 선택 표시 */}
                {isSelected && (
                  <circle cx={point.x} cy={point.y} r={DOT_RADIUS + 6} fill="none"
                    stroke="#3b82f6" strokeWidth="2" />
                )}

                {/* 코어 dot */}
                <circle cx={point.x} cy={point.y} r={DOT_RADIUS} fill={color} />

                {/* 라벨 */}
                <text
                  x={point.x}
                  y={point.y + DOT_RADIUS + 14}
                  textAnchor="middle"
                  fill="#4b5563"
                  fontSize="9"
                  fontWeight="700"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* 카메라 없을 때 */}
          {cameras.length === 0 && (
            <text x={VIEWBOX_WIDTH / 2} y={VIEWBOX_HEIGHT / 2} textAnchor="middle" fill="#94a3b8" fontSize="14">
              등록된 카메라가 없습니다
            </text>
          )}
        </svg>

        {/* 우측 하단 카메라 수 뱃지 */}
        <div className="absolute bottom-3 right-4 bg-white/90 border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[10px] text-slate-600 font-semibold">
          총 {cameras.length}대
        </div>
      </div>
    </div>
  );
}
