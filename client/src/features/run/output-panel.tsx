import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { FAILURE_TITLES, OUTCOME_META } from "./snippets";
import { useRunnerStore } from "./runner-store";

/** Run output rendered as a terminal block: `$ command`, then stdout. */
export function OutputPanel() {
  const status = useRunnerStore((s) => s.status);
  const result = useRunnerStore((s) => s.result);
  const error = useRunnerStore((s) => s.error);
  const ranCommand = useRunnerStore((s) => s.ranCommand);
  const image = useRunnerStore((s) => s.image);
  const clear = useRunnerStore((s) => s.clear);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyOutput() {
    if (!result?.stdout) return;
    try {
      await navigator.clipboard.writeText(result.stdout);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const busy = status === "running";
  const meta = result ? OUTCOME_META[result.outcome] : null;

  return (
    <section
      aria-label="Run output"
      className="overflow-hidden rounded-md border border-white/10 bg-terminal text-terminal-foreground"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2 font-mono text-xs">
        <span className="text-terminal-foreground/50">output</span>
        {busy ? <span className="text-terminal-accent">running…</span> : null}
        {meta ? <span className={meta.textClass}>{meta.label}</span> : null}
        {result ? (
          <span className="text-terminal-foreground/50">
            {result.httpStatus} · {(result.durationMs / 1000).toFixed(2)}s
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label={copied ? "Copied" : "Copy output"}
            disabled={!result?.stdout}
            onClick={() => void copyOutput()}
          >
            {copied ? <Check /> : <Copy />}
          </IconButton>
          <IconButton
            label="Clear output"
            disabled={busy || (!result && !error)}
            onClick={clear}
          >
            <RotateCcw />
          </IconButton>
        </div>
      </div>

      <div className="max-h-[26rem] overflow-auto p-3 font-mono text-sm leading-relaxed">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : busy ? (
          <div className="grid gap-2">
            <p className="text-terminal-foreground/60">booting microVM · {image}</p>
            <span className="block h-3 w-2/3 animate-pulse rounded-sm bg-white/10" />
            <span className="block h-3 w-1/3 animate-pulse rounded-sm bg-white/10" />
          </div>
        ) : result ? (
          <div className="grid gap-1.5">
            <p className="whitespace-pre-wrap wrap-break-word">
              <span className="text-terminal-accent">$ </span>
              {ranCommand}
            </p>
            {result.outcome !== "success" ? (
              <p className={meta?.textClass}>{FAILURE_TITLES[result.outcome]}</p>
            ) : null}
            {result.stdout ? (
              <pre className="whitespace-pre-wrap wrap-break-word">{result.stdout}</pre>
            ) : (
              <p className="text-terminal-foreground/40">(no output)</p>
            )}
          </div>
        ) : (
          <p className="text-terminal-foreground/40">no output yet — run a command</p>
        )}
      </div>
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-sm p-1 text-terminal-foreground/50 transition-colors hover:text-terminal-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-3.5",
      )}
    >
      {children}
    </button>
  );
}
