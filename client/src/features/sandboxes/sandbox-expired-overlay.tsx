import { Loader2 } from "lucide-react";

export function SandboxExpiredOverlay({ name }: { name: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </span>
        <div className="grid gap-1">
          <p className="font-mono text-sm">sandbox expired</p>
          <p className="max-w-xs font-mono text-xs text-muted-foreground">
            {name} reached its lifetime — deleting…
          </p>
        </div>
      </div>
    </div>
  );
}
