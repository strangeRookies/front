import { Video, Plus, Minus, Maximize2, Layers } from 'lucide-react';

interface CCTVCamera {
  id: string;
  name: string;
  x: number; // Percentage or raw coordinate (mapped below)
  y: number;
  status: 'normal' | 'alert';
}

interface CCTVFloorPlanProps {
  cameras: CCTVCamera[];
  onCameraClick: (camera: CCTVCamera) => void;
  selectedCameraId: string | null;
}

// Room-camera mapping and absolute positions in SVG viewport (800x420)
interface SVGCameraCoord {
  id: string;
  x: number;
  y: number;
}

const CAMERA_COORDS: Record<string, SVGCameraCoord> = {
  'CCTV-01': { id: 'CCTV-01', x: 170, y: 155 },
  'CCTV-02': { id: 'CCTV-02', x: 400, y: 155 },
  'CCTV-03': { id: 'CCTV-03', x: 630, y: 155 },
  'CCTV-04': { id: 'CCTV-04', x: 260, y: 345 },
  'CCTV-05': { id: 'CCTV-05', x: 540, y: 345 },
};

export function CCTVFloorPlan({ cameras, onCameraClick, selectedCameraId }: CCTVFloorPlanProps) {
  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* 도면 헤더 및 범례 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-gray-200">2단계: 선택된 구역 도면 (Floor Plan View)</h3>
        
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            정상
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            주의
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            위험
          </span>
        </div>
      </div>

      {/* 도면 그래픽 영역 */}
      <div className="flex-1 relative bg-slate-950 p-4 flex items-center justify-center overflow-hidden select-none">
        <svg className="w-full h-full max-h-[380px]" viewBox="0 0 800 420" fill="none">
          {/* 전체 외벽 바운더리 */}
          <rect x="20" y="20" width="760" height="380" fill="#f8fafc" stroke="#475569" strokeWidth="3" rx="8" />

          {/* 격자 배경 무늬 효과 (CAD 느낌 극대화) */}
          <defs>
            <pattern id="cad-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect x="22" y="22" width="756" height="376" fill="url(#cad-grid)" />

          {/* === 내부 벽선 (Room Dividers) === */}
          {/* 중앙 가로벽 */}
          <line x1="20" y1="240" x2="780" y2="240" stroke="#64748b" strokeWidth="3" />

          {/* 1층 상단 세로 분할벽 */}
          <line x1="280" y1="20" x2="280" y2="240" stroke="#64748b" strokeWidth="3" />
          <line x1="520" y1="20" x2="520" y2="240" stroke="#64748b" strokeWidth="3" />

          {/* 1층 하단 세로 분할벽 */}
          <line x1="400" y1="240" x2="400" y2="400" stroke="#64748b" strokeWidth="3" />

          {/* === 가구 및 문 도면 요소 === */}
          
          {/* 방 1 (상단 좌측) - 침대 도면 */}
          <g opacity="0.8">
            <rect x="40" y="40" width="70" height="110" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
            <rect x="45" y="45" width="60" height="25" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <line x1="40" y1="90" x2="110" y2="90" stroke="#cbd5e1" strokeWidth="1" />
          </g>

          {/* 방 2 (상단 우측) - 침대 도면 */}
          <g opacity="0.8">
            <rect x="690" y="40" width="70" height="110" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
            <rect x="695" y="45" width="60" height="25" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <line x1="690" y1="90" x2="760" y2="90" stroke="#cbd5e1" strokeWidth="1" />
          </g>

          {/* 대기실 (하단 우측) - 쇼파 도면 */}
          <g opacity="0.8">
            {/* 세로 쇼파 */}
            <rect x="715" y="270" width="35" height="100" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
            <rect x="725" y="275" width="20" height="90" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            
            {/* 가로 테이블 */}
            <rect x="620" y="300" width="70" height="40" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="3" />
          </g>

          {/* === 문 열림 표시 (Door Arc) === */}
          {/* 방 1 문 */}
          <path d="M 230 240 A 50 50 0 0 0 280 190" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="280" y1="190" x2="280" y2="240" stroke="#94a3b8" strokeWidth="1.5" />

          {/* 방 2 문 */}
          <path d="M 570 240 A 50 50 0 0 1 520 190" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="520" y1="190" x2="520" y2="240" stroke="#94a3b8" strokeWidth="1.5" />

          {/* 출입구 문 */}
          <path d="M 350 400 A 50 50 0 0 0 400 350" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="400" y1="350" x2="400" y2="400" stroke="#94a3b8" strokeWidth="1.5" />

          {/* === 룸 라벨 (Room Labels) === */}
          <g className="pointer-events-none">
            {/* 방 1 */}
            <text x="150" y="80" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">방 1</text>
            <text x="150" y="105" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">(CCTV 1)</text>

            {/* 복도 A */}
            <text x="400" y="80" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">복도 A</text>
            <text x="400" y="105" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">(CCTV 2)</text>

            {/* 방 2 */}
            <text x="650" y="80" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">방 2</text>
            <text x="650" y="105" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">(CCTV 3)</text>

            {/* 출입구 */}
            <text x="210" y="300" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">출입구</text>
            <text x="210" y="325" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">(CCTV 4)</text>

            {/* 대기실 */}
            <text x="600" y="300" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">대기실</text>
            <text x="600" y="325" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">(CCTV 5)</text>
          </g>

          {/* === CCTV 아이콘 렌더링 === */}
          {cameras.slice(0, 5).map((camera) => {
            const coord = CAMERA_COORDS[camera.id];
            if (!coord) return null;

            const isSelected = selectedCameraId === camera.id;
            const isAlert = camera.status === 'alert';

            return (
              <g
                key={camera.id}
                onClick={() => onCameraClick(camera)}
                className="cursor-pointer group transition-transform duration-200"
              >
                {/* 1. 알람 펄스 레이더 효과 */}
                {isAlert && (
                  <>
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="40"
                      fill="#ef4444"
                      className="animate-ping"
                      style={{ transformOrigin: `${coord.x}px ${coord.y}px`, animationDuration: '2s' }}
                      opacity="0.15"
                    />
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="28"
                      fill="#ef4444"
                      className="animate-pulse"
                      style={{ transformOrigin: `${coord.x}px ${coord.y}px` }}
                      opacity="0.25"
                    />
                  </>
                )}

                {/* 2. 클릭 유도 외부 글로우 링 (선택 시 파란색) */}
                {isSelected && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="24"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    className="animate-pulse"
                    style={{ transformOrigin: `${coord.x}px ${coord.y}px` }}
                  />
                )}

                {/* 3. 카메라 코어 노드 */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="18"
                  fill={isAlert ? '#f43f5e' : '#10b981'}
                  stroke={isSelected ? '#3b82f6' : isAlert ? '#e11d48' : '#059669'}
                  strokeWidth="2"
                  className="transition-colors duration-200"
                />

                {/* 4. 카메라 아이콘 심볼 */}
                <g transform={`translate(${coord.x - 8}, ${coord.y - 8})`}>
                  <path
                    d="M13.2 4.4v7.2L9.6 9.4V6.6l3.6-2.2zM1.8 4.2h6.6c.4 0 .8.4.8.8v6c0 .4-.4.8-.8.8H1.8c-.4 0-.8-.4-.8-.8V5c0-.4.4-.8.8-.8z"
                    fill="#ffffff"
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {/* 맵 우측 플로팅 툴바 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-2xl backdrop-blur">
          <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 hover:text-white transition-colors" title="Zoom In">
            <Plus className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 hover:text-white transition-colors" title="Zoom Out">
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 hover:text-white transition-colors" title="Fit to Screen">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 hover:text-white transition-colors" title="Toggle Layers">
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
