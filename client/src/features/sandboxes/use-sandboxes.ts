import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteSandbox,
  listSandboxes,
  pauseSandbox,
  startSandbox,
  stopSandbox,
  type PersistentSandbox,
} from "@/lib/api";
import { parseExpiry } from "./expiry";

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function useSandboxes(query = "") {
  const [sandboxes, setSandboxes] = useState<PersistentSandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const expiringRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await listSandboxes(query);
      if (seqRef.current !== seq) return;
      setSandboxes(next);
    } catch (cause) {
      if (seqRef.current === seq) setError(message(cause));
    } finally {
      if (seqRef.current === seq) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, refresh]);

  // Call the delete endpoint as soon as a sandbox's expiry passes.
  useEffect(() => {
    if (sandboxes.length === 0) return;

    const timer = window.setInterval(() => {
      const now = Date.now();
      for (const sandbox of sandboxes) {
        if (!sandbox.name || expiringRef.current.has(sandbox.id)) continue;
        const expiresAt = parseExpiry(sandbox.expiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt > now) continue;

        expiringRef.current.add(sandbox.id);
        void deleteSandbox(sandbox.name)
          .catch(() => undefined)
          .finally(() => {
            expiringRef.current.delete(sandbox.id);
            setSandboxes((current) => current.filter((item) => item.id !== sandbox.id));
          });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sandboxes]);

  const setStatus = useCallback((id: string, status: string) => {
    setSandboxes((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }, []);

  const start = useCallback(
    async (sandbox: PersistentSandbox) => {
      if (!sandbox.name) return;
      setWorking(`start:${sandbox.id}`);
      setError(null);
      try {
        await startSandbox(sandbox.name);
        setStatus(sandbox.id, "running");
      } catch (cause) {
        setError(message(cause));
      } finally {
        setWorking(null);
      }
    },
    [setStatus],
  );

  const pause = useCallback(
    async (sandbox: PersistentSandbox) => {
      if (!sandbox.name) return;
      setWorking(`pause:${sandbox.id}`);
      setError(null);
      try {
        await pauseSandbox(sandbox.name);
        setStatus(sandbox.id, "paused");
      } catch (cause) {
        setError(message(cause));
      } finally {
        setWorking(null);
      }
    },
    [setStatus],
  );

  const stop = useCallback(
    async (sandbox: PersistentSandbox) => {
      if (!sandbox.name) return;
      setWorking(`stop:${sandbox.id}`);
      setError(null);
      try {
        await stopSandbox(sandbox.name);
        setStatus(sandbox.id, "stopped");
      } catch (cause) {
        setError(message(cause));
      } finally {
        setWorking(null);
      }
    },
    [setStatus],
  );

  const remove = useCallback(async (sandbox: PersistentSandbox) => {
    if (!sandbox.name) return;
    try {
      await deleteSandbox(sandbox.name);
      setSandboxes((current) => current.filter((item) => item.id !== sandbox.id));
    } catch (cause) {
      setError(message(cause));
    }
  }, []);

  return { sandboxes, loading, working, error, refresh, start, pause, stop, remove };
}
