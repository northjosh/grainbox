import { useNavigate } from "@tanstack/react-router";

import { OUTCOME_META } from "./snippets";
import { useHistoryStore } from "./history-store";
import { useRunnerStore } from "./runner-store";

/** Run history rows; clicking one replays it on the run page. */
export function HistoryList() {
  const entries = useHistoryStore((s) => s.entries);
  const load = useRunnerStore((s) => s.load);
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="grid place-items-center gap-1 border-y py-10 text-center">
        <p className="font-mono text-sm text-muted-foreground">no runs yet</p>
        <p className="text-xs text-muted-foreground">finished runs show up here</p>
      </div>
    );
  }

  return (
    <ul className="divide-y border-y">
      {entries.map((entry) => {
        const meta = OUTCOME_META[entry.result.outcome];
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => {
                load(entry.image, entry.command, entry.result);
                void navigate({ to: "/" });
              }}
              className="flex w-full items-baseline gap-3 px-1.5 py-2.5 text-left font-mono text-xs transition-colors hover:bg-muted/50"
            >
              <span className="text-success">$</span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {entry.command}
              </span>
              <span className="text-muted-foreground">{entry.image}</span>
              <span className="text-muted-foreground">
                {(entry.result.durationMs / 1000).toFixed(2)}s
              </span>
              <span className={meta.textClass}>{meta.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
