import { createFileRoute } from "@tanstack/react-router";

import { OutputPanel } from "@/features/run/output-panel";
import { RunForm } from "@/features/run/run-form";
import { useRunHotkeys } from "@/features/run/use-run-hotkeys";

export const Route = createFileRoute("/_authenticated/")({
  component: RunPage,
});

function RunPage() {
  useRunHotkeys();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">run</h1>
        <p className="text-sm text-muted-foreground">
          Each command boots a fresh microVM and throws it away.
        </p>
      </header>

      <RunForm />
      <OutputPanel />
    </div>
  );
}
