import { useState, useEffect, useRef } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import Hls from 'hls.js';
import { CameraStreamFrame } from '../components/CameraStreamFrame';
import { fetchAlertEventDetail } from '../api/alertEventsApi';
import { streamRenderKind, type StreamRenderKind } from '../data/cameras';
import type { IncidentAlert } from '../types/dashboard';

// 감지 유형별 한글 표시 문구 (백엔드 ScenarioType 매핑 규칙과 동일한 패턴)
function getDetectionReasonLabel(type: string, fallback: string): string {
  const upper = type.toUpperCase();
  if (upper.includes('FALL')) return '낙상 감지';
  if (upper.includes('COLLAPSE')) return '쓰러짐 감지';
  if (upper.includes('SYNCOPE') || upper.includes('FAINT')) return '실신 감지';
  if (upper.includes('EXIT')) return '이탈 감지';
  if (upper.includes('ASSAULT') || upper.includes('VIOLENCE') || upper.includes('FIGHT')) return '폭행 감지';
  return fallback;
}

interface IncidentPlaybackModalProps {
  incident: IncidentAlert;
  isPlaying: boolean;
  playbackProgress: number;
  playbackStreamUrl?: string;
  playbackStreamKind?: StreamRenderKind;
  onClose: () => void;
  onPlaybackProgressChange: (value: number) => void;
  onTogglePlaying: () => void;
  cameraLoginId?: string;
}

export function IncidentPlaybackModal({
  incident,
  isPlaying,
  playbackProgress,
  playbackStreamUrl,
  playbackStreamKind = streamRenderKind(),
  onClose,
  onPlaybackProgressChange,
  onTogglePlaying,
  cameraLoginId,
}: IncidentPlaybackModalProps) {
  const [duration, setDuration] = useState(10);
  const [vlmSummary, setVlmSummary] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const numericId = Number(incident.id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      setVlmSummary(null);
      return;
    }
    let cancelled = false;
    void fetchAlertEventDetail(numericId).then(({ vlmDescription }) => {
      if (!cancelled) {
        setVlmSummary(vlmDescription);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [incident.id]);
  // 상대 시간(MM:SS) 포맷팅 헬퍼
  const formatRelativeTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 영상의 정중앙을 탐지 시점으로 가정 (앞뒤 5초씩 총 10초 구간 설정)
  const eventSeconds = duration / 2;
  const startSeconds = Math.max(0, eventSeconds - 5);
  const endSeconds = Math.min(duration, eventSeconds + 5);
  const currentSeconds = startSeconds + Math.min(Math.max(playbackProgress, 0), 10);

  // 비디오 소스 설정 (HLS 또는 일반 MP4 등)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackStreamUrl) return;

    // 기존 HLS 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playbackStreamUrl.includes('.m3u8')) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playbackStreamUrl;
      } else if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(playbackStreamUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      }
    } else {
      video.src = playbackStreamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackStreamUrl]);

  // 비디오 메타데이터 로드 시 전체 길이 확인 및 초기 위치 설정
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const videoDuration = video.duration || 10;
    setDuration(videoDuration);
    
    const eventSecs = videoDuration / 2;
    const startSecs = Math.max(0, eventSecs - 5);
    // 이벤트 시점(시작 시간 + 5초인 정중앙)으로 초기 탐색
    video.currentTime = startSecs + 5;
  };

  // 재생/일시정지 상태 동기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // 비디오 시간 변경 시 슬라이더 진행률 업데이트 및 10초 범위 제한
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // 설정된 10초 구간(endSeconds)을 넘어가면 다시 시작 지점(startSeconds)으로 돌려 루프합니다.
    if (video.currentTime >= endSeconds || video.currentTime < startSeconds) {
      video.currentTime = startSeconds;
      if (isPlaying) {
        video.play().catch(() => {});
      }
    }
    const progress = Math.max(0, video.currentTime - startSeconds);
    onPlaybackProgressChange(progress);
  };

  // 사용자가 슬라이더를 직접 조정했을 때
  const handleSliderChange = (val: number) => {
    const video = videoRef.current;
    const targetTime = startSeconds + val;
    if (video) {
      video.currentTime = targetTime;
    }
    onPlaybackProgressChange(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#071329] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#061224] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            <h3 className="text-sm font-extrabold text-white">이벤트 영상 확인</h3>
            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {incident.camera} / {incident.time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="cursor-pointer rounded border border-slate-800 bg-[#020817] px-2 py-1 text-xs font-bold text-slate-400 hover:text-white">닫기</button>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center">
          {incident.snapshotUrl || incident.clipUrl ? (
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="h-full w-full object-cover contrast-125 brightness-75"
              muted
              playsInline
              autoPlay
            />
          ) : (
            <CameraStreamFrame
              streamUrl={playbackStreamUrl}
              streamKind={playbackStreamKind}
              title="incident playback stream"
              className="h-full w-full object-cover contrast-125 brightness-75"
              cameraLoginId={cameraLoginId}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 pointer-events-none">
            <span className="text-sm font-bold text-white">{getDetectionReasonLabel(incident.type, incident.label)}</span>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-[#061224] px-4 py-3">
          <p className="text-[10px] font-bold tracking-wide text-blue-400">AI 장면 분석 (VLM)</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
            {vlmSummary
              ?? `규칙 기반 감지: ${getDetectionReasonLabel(incident.type, incident.label)}. 클립 VLM 분석이 완료되면 여기에 요약이 표시됩니다.`}
          </p>
        </div>
        <div className="space-y-3 bg-[#061224] p-4">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>{formatRelativeTime(startSeconds)}</span>
              <span className="font-bold text-rose-400">이벤트 시점 ({formatRelativeTime(eventSeconds)})</span>
              <span>{formatRelativeTime(endSeconds)}</span>
            </div>
            <div className="relative pt-1">
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={playbackProgress}
                onChange={(event) => handleSliderChange(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
              />
              <div className="absolute left-1/2 top-1 h-2.5 w-2 -translate-x-1/2 rounded-full border border-white bg-rose-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onTogglePlaying} className="cursor-pointer rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800">
                현재 시간: {formatRelativeTime(currentSeconds)}
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                <Volume2 className="h-4 w-4 text-slate-400" />
                <span className="text-[10px] text-slate-500">오디오</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
