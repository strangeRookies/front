import React, { useEffect } from 'react';
import { VideoOverlayPlayer } from '../VideoOverlayPlayer'; // 경로 확인 필요
import { useCctvStore } from '../../store/useCctvStore';

const MonitoringDashboard: React.FC = () => {
  // 스토어에서 데이터를 넣는 함수만 가져옵니다.
  const setTelemetryData = useCctvStore((state) => state.setTelemetryData);

  useEffect(() => {
    const interval = setInterval(() => {
      // 가짜 데이터 생성
      setTelemetryData({
        timestamp: Date.now(),
        streamId: "cam-01",
        events: [
          {
            type: "faint",
            memoText: "쓰러짐 의심!",
            confidence: 0.88 + Math.random() * 0.1,
            boundingBox: {
              x: 400 + Math.sin(Date.now() / 1000) * 20,
              y: 250 + Math.cos(Date.now() / 1000) * 10,
              width: 180,
              height: 320
            }
          }
        ]
      });
    }, 100);

    return () => clearInterval(interval);
  }, [setTelemetryData]);

  return (
    <div className="flex flex-col h-full p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">CCTV 모니터링</h1>
      </header>
      
      <main className="flex-1 flex justify-center items-center bg-black/5 rounded-xl p-4">
        {/* 'mediaStream'이 없어도 에러가 나지 않도록 
            VideoOverlayPlayer 컴포넌트 Props 정의를 
            mediaStream? 로 수정했으므로 이대로 작동합니다.
        */}
        <VideoOverlayPlayer 
          streamUrl="dummy_url" 
        />
      </main>
    </div>
  );
};

export default MonitoringDashboard;