import { create } from 'zustand';

//Zustand 스토어 및 타입 정의
// 1. 데이터 규격에 맞춘 타입 정의
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TelemetryEvent {
  type: string;
  memoText: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface TelemetryData {
  timestamp: number;
  streamId: string;
  events: TelemetryEvent[];
}

// 2. Zustand 스토어 타입 정의
interface CctvStore {
  telemetryData: TelemetryData | null;
  setTelemetryData: (data: TelemetryData) => void;
}

// 3. 스토어 생성
export const useCctvStore = create<CctvStore>((set) => ({
  telemetryData: null,
  setTelemetryData: (data) => set({ telemetryData: data }),
}));