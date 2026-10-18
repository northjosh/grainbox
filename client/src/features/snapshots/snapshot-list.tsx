import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SandboxSnapshot } from "@/lib/api";
import { formatCreated, sanitizeName } from "./helpers";

type SnapshotListProps = {
  snapshots: SandboxSnapshot[];
  loading: boolean;
  working: string | null;
  onRestore: (snapshot: SandboxSnapshot, name: string) => void;
  onDelete: (snapshot: SandboxSnapshot) => void;
};

export function SnapshotList({
  snapshots,
  loading,
  working,
  onRestore,
  onDelete,
}: SnapshotListProps) {
  const [restoring, setRestoring] = useState<SandboxSnapshot | null>(null);
  const [restoreName, setRestoreName] = useState("");

  function startRestore(snapshot: SandboxSnapshot) {
    setRestoring(snapshot);
    setRestoreName(sanitizeName(snapshot.name));
  }

  function submitRestore(event: React.FormEvent) {
    event.preventDefault();
    if (!restoring) return;
    const target = restoreName.trim();
    if (!target) return;
    onRestore(restoring, target);
    setRestoring(null);
  }

  if (loading && snapshots.length === 0) {
    return <p className="py-6 text-center font-mono text-sm text-muted-foreground">loading…</p>;
  }

  if (snapshots.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-sm text-muted-foreground">
        no snapshots yet — take one from a sandbox page
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left font-mono text-xs text-muted-foreground">
          <th className="py-2 pr-4 font-normal">name</th>
          <th className="py-2 pr-4 font-normal">created</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody className="divide-y border-t">
        {snapshots.map((snapshot) => (
          <tr key={snapshot.id}>
            <td className="py-2.5 pr-4 font-mono">{snapshot.name}</td>
            <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
              {formatCreated(snapshot.createdAt)}
            </td>
            <td className="py-2.5">
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`Restore ${snapshot.name}`}
                  aria-label={`Restore ${snapshot.name}`}
                  disabled={working !== null}
                  onClick={() => startRestore(snapshot)}
                >
                  <RotateCcw />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`Delete ${snapshot.name}`}
                  aria-label={`Delete ${snapshot.name}`}
                  disabled={working !== null}
                  onClick={() => onDelete(snapshot)}
                >
                  <Trash2 />
                </Button>
              </div>
            </td>
          </tr>
        ))}

        {restoring ? (
          <tr>
            <td colSpan={3} className="py-2.5">
              <form onSubmit={submitRestore} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground">
                  restore {restoring.name} into
                </span>
                <input
                  autoFocus
                  value={restoreName}
                  onChange={(event) => setRestoreName(event.target.value)}
                  placeholder="new sandbox name"
                  spellCheck={false}
                  className="min-w-0 flex-1 border-b bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  type="submit"
                  disabled={!restoreName.trim() || working !== null}
                  className="text-success underline-offset-4 hover:underline disabled:opacity-40"
                >
                  {working === restoring.id ? "restoring…" : "restore"}
                </button>
                <button
                  type="button"
                  onClick={() => setRestoring(null)}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  cancel
                </button>
              </form>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
