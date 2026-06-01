import { AlertTriangle, Play } from 'lucide-react';
import { useState } from 'react';

export type EventType = 'fall' | 'violence' | 'collapse' | 'fainting';

interface SimulationPanelProps {
  onSimulate: (eventType: EventType, cameraId: string) => void;
  cameraIds: string[];
}

export function SimulationPanel({ onSimulate, cameraIds }: SimulationPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventType>('fall');
  const [selectedCamera, setSelectedCamera] = useState<string>(cameraIds[0] || '');

  const eventTypes = [
    { value: 'fall' as EventType, label: '낙상', icon: '🤕' },
    { value: 'violence' as EventType, label: '폭력/싸움', icon: '👊' },
    { value: 'collapse' as EventType, label: '쓰러짐', icon: '😵' },
    { value: 'fainting' as EventType, label: '실신', icon: '😴' },
  ];

  const handleSimulate = () => {
    if (selectedCamera) {
      onSimulate(selectedEvent, selectedCamera);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-gray-400">모의 테스트</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">이벤트 종류</label>
          <div className="grid grid-cols-2 gap-2">
            {eventTypes.map((event) => (
              <button
                key={event.value}
                onClick={() => setSelectedEvent(event.value)}
                className={`p-2 rounded-lg border transition-all ${
                  selectedEvent === event.value
                    ? 'border-blue-500 bg-blue-600/20 text-white'
                    : 'border-slate-700 bg-slate-800/50 text-gray-400 hover:border-slate-600'
                }`}
              >
                <div className="text-lg mb-0.5">{event.icon}</div>
                <div className="text-xs font-medium">{event.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">CCTV 선택</label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {cameraIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSimulate}
          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <Play className="w-4 h-4" />
          모의 테스트 실행
        </button>
      </div>
    </div>
  );
}
