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
  trackingId?: number;
}

export interface TelemetryData {
  timestamp?: number;
  timestampMs?: number;
  streamId: string;
  frameWidth?: number;
  frameHeight?: number;
  events: TelemetryEvent[];
}

// 2. Zustand 스토어 타입 정의
interface CctvStore {
  telemetryData: TelemetryData | null;
  telemetryDataMap: Record<string, TelemetryData>;
  setTelemetryData: (data: TelemetryData) => void;
}

// 3. 스토어 생성
export const useCctvStore = create<CctvStore>((set) => ({
  telemetryData: null,
  telemetryDataMap: {},
  setTelemetryData: (data) => set((state) => ({
    telemetryData: data,
    telemetryDataMap: {
      ...state.telemetryDataMap,
      [data.streamId]: data
    }
  })),
}));