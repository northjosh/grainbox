import { useCallback, useEffect, useState } from "react";

import { deleteSandbox, listSandboxes, type PersistentSandbox } from "@/lib/api";

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function useSandboxes() {
  const [sandboxes, setSandboxes] = useState<PersistentSandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSandboxes(await listSandboxes());
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (sandbox: PersistentSandbox) => {
    if (!sandbox.name) return;
    try {
      await deleteSandbox(sandbox.name);
      setSandboxes((current) => current.filter((item) => item.id !== sandbox.id));
    } catch (cause) {
      setError(message(cause));
    }
  }, []);

  return { sandboxes, loading, error, refresh, remove };
}
