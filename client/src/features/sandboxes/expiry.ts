export function parseExpiry(expiresAt: string | null | undefined): number {
  if (!expiresAt) return Number.NaN;
  return Date.parse(expiresAt);
}

/** Human-readable remaining lifetime, e.g. "11h 04m left" or "expired". */
export function formatTimeLeft(expiresAt: string | null | undefined, now: number): string {
  const expiresAtMs = parseExpiry(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return "—";

  const remainingMs = expiresAtMs - now;
  if (remainingMs <= 0) return "expired";

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m left`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s left`;
  return `${seconds}s left`;
}
