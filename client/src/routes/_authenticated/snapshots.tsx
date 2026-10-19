import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SnapshotList } from "@/features/snapshots/snapshot-list";
import { useSandboxSnapshots } from "@/features/snapshots/use-sandbox-snapshots";

export const Route = createFileRoute("/_authenticated/snapshots")({
  component: SnapshotsPage,
});

function SnapshotsPage() {
  const { snapshots, loading, working, error, refresh, restore, remove } = useSandboxSnapshots();
  const navigate = useNavigate();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div className="flex items-end justify-between gap-4">
        <header className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">snapshots</h1>
          <p className="text-sm text-muted-foreground">
            Full copies of a sandbox&apos;s disk. Restore one to boot a new sandbox from it.
          </p>
        </header>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-mono"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          refresh
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <SnapshotList
        snapshots={snapshots}
        loading={loading}
        working={working}
        onDelete={(snapshot) => void remove(snapshot)}
        onRestore={(snapshot, name) => {
          void (async () => {
            const sandbox = await restore(snapshot, name);
            if (sandbox?.name) {
              void navigate({ to: "/sandboxes/$name", params: { name: sandbox.name } });
            }
          })();
        }}
      />
    </div>
  );
}
