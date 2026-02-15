import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface KeyboardShortcutsProps {
  onOpenCommandPalette: () => void;
  onOpenHelp: () => void;
}

const shortcuts: Record<string, string> = {
  d: "/admin/dashboard",
  a: "/admin/applications",
  c: "/admin/chat",
  s: "/admin/settings",
  r: "/admin/reports",
  n: "/admin/analytics",
  b: "/admin/blog",
  u: "/admin/users",
};

export function KeyboardShortcuts({ onOpenCommandPalette, onOpenHelp }: KeyboardShortcutsProps) {
  const navigate = useNavigate();
  const waitingForSecond = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // ? for help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // G + key sequences
      if (e.key.toLowerCase() === "g" && !waitingForSecond.current) {
        waitingForSecond.current = true;
        timerRef.current = setTimeout(() => {
          waitingForSecond.current = false;
        }, 1000);
        return;
      }

      if (waitingForSecond.current) {
        waitingForSecond.current = false;
        clearTimeout(timerRef.current);
        const target = shortcuts[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(timerRef.current);
    };
  }, [navigate, onOpenCommandPalette, onOpenHelp, isInputFocused]);

  return null;
}
