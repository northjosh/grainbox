import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createSnapshot as createSnapshotApi,
  deleteSnapshot as deleteSnapshotApi,
  listSnapshots,
  restoreSnapshot as restoreSnapshotApi,
  type PersistentSandbox,
  type SandboxSnapshot,
} from "@/lib/api";

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function mergeSnapshots(remote: SandboxSnapshot[], local: SandboxSnapshot[]): SandboxSnapshot[] {
  const seen = new Set(remote.map((snapshot) => snapshot.id));
  const merged = [...remote, ...local.filter((snapshot) => !seen.has(snapshot.id))];
  return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Snapshots for testing: create from a sandbox, restore into a new sandbox,
 * delete. Lists the user's snapshots from the backend, merged with anything
 * taken this session. Omit `sandboxName` to use it as a plain list.
 */
export function useSandboxSnapshots(sandboxName?: string) {
  const [snapshots, setSnapshots] = useState<SandboxSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [listed, setListed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createdRef = useRef<SandboxSnapshot[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await listSnapshots();
      setListed(true);
      setSnapshots(mergeSnapshots(remote, createdRef.current));
      setError(null);
    } catch (cause) {
      setListed(false);
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string) => {
      if (!sandboxName) return;
      setWorking("create");
      setError(null);
      try {
        const created = await createSnapshotApi(sandboxName, name);
        createdRef.current = [created, ...createdRef.current];
        setSnapshots((current) => mergeSnapshots([created], current));
      } catch (cause) {
        setError(message(cause));
        toast.error("could not create snapshot", { description: message(cause) });
      } finally {
        setWorking(null);
      }
    },
    [sandboxName],
  );

  const restore = useCallback(
    async (snapshot: SandboxSnapshot, name: string): Promise<PersistentSandbox | null> => {
      setWorking(snapshot.id);
      setError(null);
      try {
        const sandbox = await restoreSnapshotApi(snapshot.id, name);
        if (!sandbox) throw new Error("restore did not return a sandbox");
        toast.success(`restored ${snapshot.name} into ${name}`, {
          description: "new sandbox created from snapshot",
          duration: 8_000,
        });
        return sandbox;
      } catch (cause) {
        setError(message(cause));
        toast.error("could not restore snapshot", { description: message(cause) });
        return null;
      } finally {
        setWorking(null);
      }
    },
    [],
  );

  const remove = useCallback(async (snapshot: SandboxSnapshot) => {
    setWorking(snapshot.id);
    setError(null);
    try {
      await deleteSnapshotApi(snapshot.name);
      createdRef.current = createdRef.current.filter((entry) => entry.id !== snapshot.id);
      setSnapshots((current) => current.filter((entry) => entry.id !== snapshot.id));
    } catch (cause) {
      setError(message(cause));
      toast.error("could not delete snapshot", { description: message(cause) });
    } finally {
      setWorking(null);
    }
  }, []);

  return { snapshots, loading, listed, working, error, refresh, create, restore, remove };
}

export type SandboxSnapshotsState = ReturnType<typeof useSandboxSnapshots>;
