import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SandboxCreateForm } from "@/features/sandboxes/sandbox-create-form";
import { SandboxList } from "@/features/sandboxes/sandbox-list";
import { useSandboxes } from "@/features/sandboxes/use-sandboxes";

export const Route = createFileRoute("/_authenticated/sandboxes/")({
  component: SandboxesPage,
});

function SandboxesPage() {
  const { sandboxes, loading, error, refresh, remove } = useSandboxes();
  const navigate = useNavigate();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div className="flex items-end justify-between gap-4">
        <header className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">sandboxes</h1>
          <p className="text-sm text-muted-foreground">
            Persistent VMs that keep their disk between commands.
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

      <SandboxCreateForm
        onCreated={(name) => {
          void navigate({ to: "/sandboxes/$name", params: { name } });
        }}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <SandboxList sandboxes={sandboxes} loading={loading} onDelete={(s) => void remove(s)} />
    </div>
  );
}
