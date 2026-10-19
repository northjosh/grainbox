import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, RotateCcw, Trash2, X } from "lucide-react";

import { useSandboxSnapshots } from "./use-sandbox-snapshots";
import { formatCreated, sanitizeName as sanitize } from "./helpers";
import type { SandboxSnapshot } from "@/lib/api";

/** Take, restore, and delete snapshots for testing sandbox state. */
export function SnapshotsPanel({
  sandboxName,
  onClose,
}: {
  sandboxName: string;
  onClose: () => void;
}) {
  const { snapshots, loading, listed, working, error, create, restore, remove } =
    useSandboxSnapshots(sandboxName);
  const navigate = useNavigate();

  const [name, setName] = useState(
    () => `${sanitize(sandboxName)}-${Date.now().toString(36).slice(-4)}`,
  );
  const [restoring, setRestoring] = useState<SandboxSnapshot | null>(null);
  const [restoreName, setRestoreName] = useState("");

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await create(trimmed);
  }

  async function submitRestore(event: React.FormEvent) {
    event.preventDefault();
    if (!restoring) return;
    const target = restoreName.trim();
    if (!target) return;
    const sandbox = await restore(restoring, target);
    setRestoring(null);
    if (sandbox?.name) {
      void navigate({ to: "/sandboxes/$name", params: { name: sandbox.name } });
    }
  }

  return (
    <section aria-label="Snapshots" className="h-fit rounded-md border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">snapshots</span>
        {!listed && !loading ? (
          <span
            className="font-mono text-xs text-muted-foreground/70"
            title="No GET /api/snapshots route yet — showing snapshots taken in this session"
          >
            session only
          </span>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          title="Hide snapshots"
          aria-label="Hide snapshots"
          className="ml-auto rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
        >
          <X />
        </button>
      </div>

      <div className="grid gap-1 p-3 font-mono text-xs">
        <form
          onSubmit={(event) => void submitCreate(event)}
          className="flex items-center gap-2 pb-2"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="snapshot name"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!name.trim() || working !== null}
            className="text-success underline-offset-4 hover:underline disabled:opacity-40"
          >
            {working === "create" ? "taking…" : "take"}
          </button>
        </form>

        {loading ? <p className="py-2 text-muted-foreground/70">loading…</p> : null}

        {!loading && snapshots.length === 0 ? (
          <p className="py-2 text-muted-foreground/70">no snapshots yet</p>
        ) : null}

        {snapshots.map((snapshot) => (
          <div key={snapshot.id} className="grid gap-1 py-1">
            <div className="flex items-center gap-2">
              <Camera className="size-3.5 shrink-0 text-muted-foreground/70" />
              <span className="min-w-0 truncate text-foreground">{snapshot.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground/70">
                {formatCreated(snapshot.createdAt)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRestoring(snapshot);
                    setRestoreName(sanitize(snapshot.name));
                  }}
                  disabled={working !== null}
                  title={`Restore ${snapshot.name}`}
                  aria-label={`Restore ${snapshot.name}`}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
                >
                  <RotateCcw />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(snapshot)}
                  disabled={working !== null}
                  title={`Delete ${snapshot.name}`}
                  aria-label={`Delete ${snapshot.name}`}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40 [&_svg]:size-3.5"
                >
                  <Trash2 />
                </button>
              </div>
            </div>

            {restoring?.id === snapshot.id ? (
              <form
                onSubmit={(event) => void submitRestore(event)}
                className="flex items-center gap-2 pl-5"
              >
                <input
                  autoFocus
                  value={restoreName}
                  onChange={(event) => setRestoreName(event.target.value)}
                  placeholder="new sandbox name"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  type="submit"
                  disabled={!restoreName.trim() || working !== null}
                  className="text-success underline-offset-4 hover:underline disabled:opacity-40"
                >
                  {working === snapshot.id ? "restoring…" : "restore"}
                </button>
                <button
                  type="button"
                  onClick={() => setRestoring(null)}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  cancel
                </button>
              </form>
            ) : null}
          </div>
        ))}

        {error ? <p className="pt-1 text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
