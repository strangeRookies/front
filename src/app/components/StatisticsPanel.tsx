import { Activity, AlertTriangle, CheckCircle, Video } from 'lucide-react';

interface StatisticsPanelProps {
  totalCameras: number;
  activeCameras: number;
  alertCount: number;
  todayEvents: number;
}

export function StatisticsPanel({ totalCameras, activeCameras, alertCount, todayEvents }: StatisticsPanelProps) {
  const stats = [
    {
      label: '전체',
      value: totalCameras,
      icon: Video,
      color: 'text-blue-400',
    },
    {
      label: '정상',
      value: activeCameras,
      icon: CheckCircle,
      color: 'text-green-400',
    },
    {
      label: '경고',
      value: alertCount,
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      label: '금일',
      value: todayEvents,
      icon: Activity,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="flex gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className={`w-4 h-4 ${stat.color}`} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold text-white">{stat.value}</span>
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
