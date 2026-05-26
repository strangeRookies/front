import { Video, AlertTriangle } from 'lucide-react';

interface CCTVCamera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'normal' | 'alert';
}

interface CCTVFloorPlanProps {
  cameras: CCTVCamera[];
  onCameraClick: (camera: CCTVCamera) => void;
  selectedCameraId: string | null;
}

export function CCTVFloorPlan({ cameras, onCameraClick, selectedCameraId }: CCTVFloorPlanProps) {
  return (
    <div className="relative w-full h-full bg-slate-950 rounded-lg overflow-hidden">
      {/* 3D 스타일 도면 배경 */}
      <svg className="w-full h-full" viewBox="0 0 800 600">
        {/* 배경 그리드 */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid)" />

        {/* 건물 구조 - 입체감 있는 디자인 */}
        {/* 1층 로비 */}
        <g>
          <rect x="50" y="50" width="350" height="250" fill="#334155" stroke="#475569" strokeWidth="2" />
          <rect x="50" y="50" width="350" height="250" fill="url(#grad1)" opacity="0.3" />
          <text x="225" y="170" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="500">1층 로비</text>
        </g>

        {/* 병동 */}
        <g>
          <rect x="400" y="50" width="350" height="250" fill="#334155" stroke="#475569" strokeWidth="2" />
          <rect x="400" y="50" width="350" height="250" fill="url(#grad2)" opacity="0.3" />
          <text x="575" y="170" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="500">병동</text>
        </g>

        {/* 공원 입구 */}
        <g>
          <rect x="50" y="300" width="350" height="250" fill="#334155" stroke="#475569" strokeWidth="2" />
          <rect x="50" y="300" width="350" height="250" fill="url(#grad3)" opacity="0.3" />
          <text x="225" y="420" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="500">공원 입구</text>
        </g>

        {/* 주차장 */}
        <g>
          <rect x="400" y="300" width="350" height="250" fill="#334155" stroke="#475569" strokeWidth="2" />
          <rect x="400" y="300" width="350" height="250" fill="url(#grad4)" opacity="0.3" />
          <text x="575" y="420" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="500">주차장</text>
        </g>

        {/* 그라데이션 정의 */}
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#1e40af', stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#5b21b6', stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#047857', stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#b45309', stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* CCTV 아이콘 표시 */}
      {cameras.map((camera) => (
        <button
          key={camera.id}
          onClick={() => onCameraClick(camera)}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all group ${
            selectedCameraId === camera.id
              ? 'scale-125 z-10'
              : 'hover:scale-110 z-0'
          }`}
          style={{
            left: `${camera.x}%`,
            top: `${camera.y}%`,
          }}
          title={camera.name}
        >
          <div className="relative">
            {/* 펄스 효과 */}
            {camera.status === 'alert' && (
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            )}

            {/* 카메라 아이콘 */}
            <div className={`relative p-2 rounded-full shadow-2xl border-2 ${
              camera.status === 'alert'
                ? 'bg-red-600 border-red-400'
                : selectedCameraId === camera.id
                ? 'bg-blue-600 border-blue-400'
                : 'bg-slate-700 border-slate-500'
            }`}>
              <Video className="w-5 h-5 text-white" />
            </div>

            {/* 경고 아이콘 */}
            {camera.status === 'alert' && (
              <AlertTriangle className="absolute -top-1 -right-1 w-4 h-4 text-red-500 fill-yellow-400 drop-shadow-lg" />
            )}

            {/* 툴팁 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded shadow-xl border border-slate-700">
                <div className="font-semibold">{camera.id}</div>
                <div className="text-gray-400 text-xs">{camera.name}</div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
