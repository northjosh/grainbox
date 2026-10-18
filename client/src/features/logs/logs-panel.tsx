import { useEffect, useRef } from "react";
import { Eraser, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSandboxLogs, type LogStreamStatus } from "./use-sandbox-logs";

const STATUS_META: Record<LogStreamStatus, { label: string; className: string }> = {
  connecting: { label: "connecting", className: "text-terminal-foreground/50" },
  open: { label: "streaming", className: "text-success" },
  reconnecting: { label: "reconnecting", className: "text-warning" },
  closed: { label: "disconnected", className: "text-terminal-foreground/50" },
};

/** Live sandbox logs streamed over SSE, rendered as a terminal block. */
export function LogsPanel({
  sandboxName,
  onClose,
}: {
  sandboxName: string;
  onClose: () => void;
}) {
  const { lines, status, clear } = useSandboxLogs(sandboxName);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }

  const meta = STATUS_META[status];

  return (
    <section
      aria-label="Sandbox logs"
      className="overflow-hidden rounded-md border border-white/10 bg-terminal text-terminal-foreground"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2 font-mono text-xs">
        <span className="text-terminal-foreground/50">logs</span>
        <span className={cn("flex items-center gap-1.5", meta.className)}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {meta.label}
        </span>
        <span className="text-terminal-foreground/30">{lines.length} lines</span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="Clear logs"
            aria-label="Clear logs"
            disabled={lines.length === 0}
            onClick={clear}
            className={cn(
              "rounded-sm p-1 text-terminal-foreground/50 transition-colors hover:text-terminal-foreground",
              "disabled:pointer-events-none disabled:opacity-40",
              "[&_svg]:size-3.5",
            )}
          >
            <Eraser />
          </button>
          <button
            type="button"
            title="Hide logs"
            aria-label="Hide logs"
            onClick={onClose}
            className={cn(
              "rounded-sm p-1 text-terminal-foreground/50 transition-colors hover:text-terminal-foreground",
              "[&_svg]:size-3.5",
            )}
          >
            <X />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-64 overflow-auto p-3 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-terminal-foreground/40">no logs yet</p>
        ) : (
          lines.map((line, index) => (
            <p
              key={index}
              className="whitespace-pre-wrap wrap-break-word text-terminal-foreground/80"
            >
              {line}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
