import { useCallback, useRef } from "react";

const STORAGE_KEY = "edlead-notification-volume";

/** Get the stored volume (0–1). Default 0.15. 0 = muted. */
export function getNotificationVolume(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return Math.max(0, Math.min(1, Number(stored)));
  } catch { /* ignore */ }
  return 0.15;
}

/** Persist volume preference (0–1). */
export function setNotificationVolume(v: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.min(1, v))));
  } catch { /* ignore */ }
}

// Simple notification sounds using Web Audio API - no external files needed
export function useChatNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((ctx: AudioContext, freq: number, startTime: number, duration: number, type: OscillatorType = "sine", volume = 0.15) => {
    const masterVolume = getNotificationVolume();
    if (masterVolume === 0) return; // muted
    const adjustedVolume = volume * (masterVolume / 0.15); // scale relative to default

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(adjustedVolume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }, []);

  // Visitor chat: bright ascending two-tone (A5 → D6)
  const playNotification = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(ctx, 880, now, 0.15);          // A5
      playTone(ctx, 1174.66, now + 0.12, 0.2); // D6
    } catch {
      // Audio not available, silently ignore
    }
  }, [getCtx, playTone]);

  // Team DM: softer descending three-tone (E5 → C5 → G4) with triangle wave
  const playDMNotification = useCallback(() => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      playTone(ctx, 659.25, now, 0.12, "triangle", 0.12);       // E5
      playTone(ctx, 523.25, now + 0.1, 0.12, "triangle", 0.12); // C5
      playTone(ctx, 392.0, now + 0.2, 0.18, "triangle", 0.1);   // G4
    } catch {
      // Audio not available, silently ignore
    }
  }, [getCtx, playTone]);

  return { playNotification, playDMNotification };
}
