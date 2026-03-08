import { useState, useEffect } from "react";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-white.png";

interface PortalLoadingScreenProps {
  portalName?: string;
}

const loadingMessages = [
  "Preparing your portal...",
  "Verifying credentials...",
  "Loading your dashboard...",
  "Almost there...",
];

export function PortalLoadingScreen({ portalName = "Portal" }: PortalLoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(msgInterval);
  }, []);

  useEffect(() => {
    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 12 + 3;
      });
    }, 300);
    return () => clearInterval(progInterval);
  }, []);

  // Detect dark mode
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Floating gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.07] blur-3xl animate-user-access-orb-drift"
          style={{ background: "hsl(var(--primary))" }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-[0.05] blur-3xl animate-user-access-orb-drift"
          style={{ background: "hsl(var(--primary))", animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        {/* Logo */}
        <img
          src={isDark ? edleadLogoDark : edleadLogo}
          alt="edLEAD"
          className="h-12 w-auto"
        />

        {/* Portal name */}
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          {portalName}
        </p>

        {/* Progress bar */}
        <div className="w-56 h-1.5 rounded-full bg-muted overflow-hidden relative">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out animate-portal-loading-shimmer"
            style={{ width: `${Math.min(progress, 90)}%` }}
          />
        </div>

        {/* Loading message */}
        <p
          key={messageIndex}
          className="text-sm text-muted-foreground animate-portal-loading-fade-text"
        >
          {loadingMessages[messageIndex]}
        </p>
      </div>
    </div>
  );
}
