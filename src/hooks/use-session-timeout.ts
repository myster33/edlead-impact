import { useEffect, useRef, useCallback } from "react";

interface UseSessionTimeoutOptions {
  timeoutMinutes: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({
  timeoutMinutes,
  onTimeout,
  enabled = true,
}: UseSessionTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onTimeout();
      }, timeoutMs);
    }
  }, [enabled, timeoutMs, onTimeout]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      resetTimeout();
    };

    // Set initial timeout
    resetTimeout();

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimeout]);

  return { resetTimeout };
}
