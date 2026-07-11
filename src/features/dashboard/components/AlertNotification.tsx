import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import { VlmSnapshotAssistPanel } from './VlmSnapshotAssistPanel';
import type { VlmSnapshotAssistResult } from '../types/vlmSnapshotAssist';

declare global {
  interface Window {
    readonly webkitAudioContext?: typeof AudioContext;
  }
}

interface AlertNotificationProps {
  message: string;
  cameraId: string;
  onClose: () => void;
  /** Optional side-channel VLM snapshot assist (never blocks alert UI). */
  eventId?: string | null;
  vlmAssist?: VlmSnapshotAssistResult | null;
}

export function AlertNotification({ message, cameraId, onClose, eventId, vlmAssist }: AlertNotificationProps) {
  useEffect(() => {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();

    setTimeout(() => oscillator.stop(), 200);
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 800;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      setTimeout(() => osc2.stop(), 200);
    }, 300);
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 800;
      osc3.type = 'sine';
      gain3.gain.value = 0.3;
      osc3.start();
      setTimeout(() => osc3.stop(), 200);
    }, 600);

    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className="bg-red-600 text-white rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <h4 className="font-bold mb-1">안전 이벤트 알림</h4>
              <p className="text-sm mb-1">{message}</p>
              <p className="text-xs opacity-90">카메라: {cameraId}</p>
              <div className="mt-2 rounded bg-red-700/40 p-2 text-left text-xs">
                <VlmSnapshotAssistPanel eventId={eventId} assist={vlmAssist} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-red-800">
          <div className="h-full bg-white animate-progress" style={{ animation: 'progress 10s linear' }} />
        </div>
      </div>
    </div>
  );
}
