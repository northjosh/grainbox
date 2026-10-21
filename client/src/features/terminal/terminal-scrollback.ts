const PREFIX = "grainbox:scrollback:";
const MAX_CHARS = 200_000;

function storageKey(sandboxName: string, tabId: number): string {
  return `${PREFIX}${sandboxName}:${tabId}`;
}

/** Best-effort scrollback restore for a sandbox shell tab. */
export function loadScrollback(sandboxName: string, tabId: number): string {
  try {
    return sessionStorage.getItem(storageKey(sandboxName, tabId)) ?? "";
  } catch {
    return "";
  }
}

export function saveScrollback(sandboxName: string, tabId: number, value: string): void {
  try {
    if (!value) {
      sessionStorage.removeItem(storageKey(sandboxName, tabId));
      return;
    }
    sessionStorage.setItem(storageKey(sandboxName, tabId), value.slice(-MAX_CHARS));
  } catch {
    // Storage can be unavailable or full; scrollback is best-effort.
  }
}

export function clearScrollback(sandboxName: string): void {
  try {
    const prefix = `${PREFIX}${sandboxName}:`;
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function appendScrollback(current: string, chunk: string): string {
  const next = current + chunk;
  return next.length > MAX_CHARS ? next.slice(next.length - MAX_CHARS) : next;
}
