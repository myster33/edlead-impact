import { useCallback, useRef } from "react";

// Simple notification sound using Web Audio API - no external files needed
export function useChatNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotification = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Create a pleasant two-tone notification
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.15);        // A5
      playTone(1174.66, now + 0.12, 0.2); // D6
    } catch {
      // Audio not available, silently ignore
    }
  }, []);

  return { playNotification };
}
