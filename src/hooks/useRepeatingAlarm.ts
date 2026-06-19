import { useEffect } from 'react';
import { logger } from '../shared/utils/logger';

interface UseRepeatingAlarmOptions {
  readonly enabled: boolean;
  readonly intervalMs?: number;
}

export function useRepeatingAlarm({ enabled, intervalMs = 2000 }: UseRepeatingAlarmOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let closed = false;
    const play = () => {
      if (closed || !window.AudioContext) {
        return;
      }
      try {
        const context = new window.AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.12, context.currentTime);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
        oscillator.addEventListener('ended', () => {
          void context.close();
        });
      } catch (error) {
        if (error instanceof DOMException || error instanceof Error) {
          logger.warn('AI alarm sound was blocked or unavailable.');
          return;
        }
        throw error;
      }
    };

    play();
    const timer = window.setInterval(play, intervalMs);
    return () => {
      closed = true;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
