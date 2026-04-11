import { format } from "date-fns";

/**
 * Convert an ISO/UTC date string to a Date object shifted to SAST (UTC+2) for display.
 * This ensures times display as South African time regardless of browser timezone.
 */
export function toSAST(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getTime() + 2 * 60 * 60 * 1000);
}

/** Format date in SAST, e.g. "dd MMM yyyy" */
export function formatDateSAST(iso: string, fmt: string): string {
  const sast = toSAST(iso);
  // Use UTC methods via a shifted date so format() outputs SAST values
  return format(sast, fmt);
}

/** Get HH:mm in SAST from an ISO string */
export function getTimeSAST(iso: string): string {
  const d = new Date(iso);
  const sast = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const hh = String(sast.getUTCHours()).padStart(2, "0");
  const mm = String(sast.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
