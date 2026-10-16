import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { HistoryList } from "@/features/run/history-list";
import { useHistoryStore } from "@/features/run/history-store";

export const Route = createFileRoute("/_authenticated/runs")({
  component: RunsPage,
});

function RunsPage() {
  const count = useHistoryStore((s) => s.entries.length);
  const clear = useHistoryStore((s) => s.clear);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div className="flex items-end justify-between gap-4">
        <header className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">runs</h1>
          <p className="text-sm text-muted-foreground">
            {count === 0 ? "Nothing here yet." : `${count} finished run${count === 1 ? "" : "s"}.`}
          </p>
        </header>
        {count > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="font-mono" onClick={clear}>
            clear
          </Button>
        ) : null}
      </div>

      <HistoryList />
    </div>
  );
}
