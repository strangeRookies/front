import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export interface LogEvent {
  id: string;
  timestamp: Date;
  cameraId: string;
  eventType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

interface EventLogProps {
  events: LogEvent[];
}

export function EventLog({ events }: EventLogProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-950/50 border-red-600 text-red-300';
      case 'warning':
        return 'bg-yellow-950/50 border-yellow-600 text-yellow-300';
      case 'info':
        return 'bg-blue-950/50 border-blue-600 text-blue-300';
      default:
        return 'bg-slate-800/50 border-slate-600 text-slate-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-gray-400">이벤트 로그</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center text-slate-600 py-12">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">이벤트가 없습니다</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border-l-2 ${getSeverityColor(event.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(event.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{event.cameraId}</span>
                      <span className="text-xs opacity-60 font-mono">
                        {event.timestamp.toLocaleTimeString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{event.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
