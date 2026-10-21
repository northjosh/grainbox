import { useCallback, useEffect, useRef, useState } from "react";

import { getSandbox, type PersistentSandbox } from "@/lib/api";

/** Fetches a sandbox and keeps its lifecycle status fresh. */
export function useSandbox(name: string, pollMs = 5000) {
  const [sandbox, setSandbox] = useState<PersistentSandbox | null>(null);
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const next = await getSandbox(name);
      if (seqRef.current === seq) setSandbox(next);
    } catch {
      // Keep the last known state on transient failures.
    }
  }, [name]);

  useEffect(() => {
    setSandbox(null);
    void refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  return { sandbox, refresh };
}
