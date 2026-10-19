import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteSandbox,
  listSandboxes,
  startSandbox,
  stopSandbox,
  type PersistentSandbox,
} from "@/lib/api";

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function useSandboxes(query = "") {
  const [sandboxes, setSandboxes] = useState<PersistentSandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

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

  return { sandboxes, loading, working, error, refresh, start, stop, remove };
}
