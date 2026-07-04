/**
 * overlayMetrics.ts
 *
 * 정량 검증용 overlay 렌더링 지표 누적 모듈.
 * VITE_FRONT_OVERLAY_SYNC_DEBUG=true 일 때 10초마다 콘솔에 JSON 리포트를 출력한다.
 */

export interface OverlayFrameRecord {
  readonly cameraLoginId: string;
  readonly selectedFrameId: number | string | undefined;
  readonly selectedTimestampMs: number | undefined;
  readonly sourcePath: 'matchedOverlay' | 'propEvent' | 'none';
  readonly bboxCount: number;
  readonly fallbackIdCount: number;
  readonly eventBboxCount: number;
  readonly selectedDeltaMs: number;
  readonly overlayAgeMs: number;
  readonly wasStaleSkipped: boolean;
}

export interface OverlayMetricsReport {
  readonly totalFrames: number;
  readonly bboxPresentFrames: number;
  readonly missingBboxFrames: number;
  readonly fallbackIdFrames: number;
  readonly fallbackIdRate: string;
  readonly staleSkippedFrames: number;
  readonly avgSelectedDeltaMs: string;
  readonly maxSelectedDeltaMs: number;
  readonly totalBboxRendered: number;
  readonly totalFallbackBbox: number;
  readonly fallbackBboxRate: string;
  readonly totalEventBbox: number;
  readonly reportedAtMs: number;
}

class OverlayMetricsAccumulator {
  private totalFrames = 0;
  private bboxPresentFrames = 0;
  private missingBboxFrames = 0;
  private fallbackIdFrames = 0;
  private staleSkippedFrames = 0;
  private totalDeltaMs = 0;
  private maxDeltaMs = 0;
  private totalBboxRendered = 0;
  private totalFallbackBbox = 0;
  private totalEventBbox = 0;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private readonly reportIntervalMs = 10_000;

  start(): void {
    if (this.intervalHandle !== null) return;
    this.intervalHandle = setInterval(() => {
      if (import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true') {
        console.log('[Overlay Metrics Report]', JSON.stringify(this.getReport(), null, 2));
      }
    }, this.reportIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  record(frame: OverlayFrameRecord): void {
    this.totalFrames += 1;
    if (frame.wasStaleSkipped) {
      this.staleSkippedFrames += 1;
      return;
    }
    if (frame.bboxCount > 0) {
      this.bboxPresentFrames += 1;
    } else {
      this.missingBboxFrames += 1;
    }
    if (frame.fallbackIdCount > 0) {
      this.fallbackIdFrames += 1;
    }
    this.totalDeltaMs += frame.selectedDeltaMs;
    if (frame.selectedDeltaMs > this.maxDeltaMs) {
      this.maxDeltaMs = frame.selectedDeltaMs;
    }
    this.totalBboxRendered += frame.bboxCount;
    this.totalFallbackBbox += frame.fallbackIdCount;
    this.totalEventBbox += frame.eventBboxCount;
  }

  getReport(): OverlayMetricsReport {
    const renderedFrames = this.bboxPresentFrames + this.missingBboxFrames;
    const fallbackIdRate = renderedFrames > 0
      ? ((this.fallbackIdFrames / renderedFrames) * 100).toFixed(1) + '%'
      : 'n/a';
    const avgDeltaMs = renderedFrames > 0
      ? (this.totalDeltaMs / renderedFrames).toFixed(1)
      : 'n/a';
    const fallbackBboxRate = this.totalBboxRendered > 0
      ? ((this.totalFallbackBbox / this.totalBboxRendered) * 100).toFixed(1) + '%'
      : 'n/a';
    return {
      totalFrames: this.totalFrames,
      bboxPresentFrames: this.bboxPresentFrames,
      missingBboxFrames: this.missingBboxFrames,
      fallbackIdFrames: this.fallbackIdFrames,
      fallbackIdRate,
      staleSkippedFrames: this.staleSkippedFrames,
      avgSelectedDeltaMs: avgDeltaMs,
      maxSelectedDeltaMs: this.maxDeltaMs,
      totalBboxRendered: this.totalBboxRendered,
      totalFallbackBbox: this.totalFallbackBbox,
      fallbackBboxRate,
      totalEventBbox: this.totalEventBbox,
      reportedAtMs: Date.now(),
    };
  }

  reset(): void {
    this.totalFrames = 0;
    this.bboxPresentFrames = 0;
    this.missingBboxFrames = 0;
    this.fallbackIdFrames = 0;
    this.staleSkippedFrames = 0;
    this.totalDeltaMs = 0;
    this.maxDeltaMs = 0;
    this.totalBboxRendered = 0;
    this.totalFallbackBbox = 0;
    this.totalEventBbox = 0;
  }
}

// 싱글턴 — 앱 전체에서 하나의 누적기를 공유한다.
export const overlayMetrics = new OverlayMetricsAccumulator();

// 개발 환경에서 자동으로 시작
if (import.meta.env.VITE_FRONT_OVERLAY_SYNC_DEBUG === 'true') {
  overlayMetrics.start();
}
