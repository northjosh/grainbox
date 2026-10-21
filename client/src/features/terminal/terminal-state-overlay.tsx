import { Loader2, Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

type TerminalStateOverlayProps = {
  status: string;
  pending: boolean;
  onStart: () => void;
};

export function TerminalStateOverlay({ status, pending, onStart }: TerminalStateOverlayProps) {
  const paused = status === "paused";
  const stopped = status === "stopped";

  const title = paused ? "sandbox paused" : stopped ? "sandbox stopped" : "checking sandbox…";
  const description = paused
    ? "The VM is frozen. Resume it to reconnect your shell."
    : stopped
      ? "Start the sandbox to reconnect your shell."
      : "Waiting for the sandbox status.";

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-terminal/95 p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-terminal-foreground/70 [&_svg]:size-4">
        {paused ? <Pause /> : stopped ? <Square /> : <Loader2 className="animate-spin" />}
      </span>

      <div className="grid gap-1">
        <p className="font-mono text-sm text-terminal-foreground">{title}</p>
        <p className="max-w-xs font-mono text-xs text-terminal-foreground/50">{description}</p>
      </div>

      {paused || stopped ? (
        <Button
          type="button"
          size="sm"
          className="font-mono"
          disabled={pending}
          onClick={onStart}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Play />}
          {paused ? "resume" : "start"}
        </Button>
      ) : null}
    </div>
  );
}
