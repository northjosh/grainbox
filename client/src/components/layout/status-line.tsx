import { MAX_CONCURRENT } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useServerStore } from "@/lib/store/server-store";
import { useRunnerStore } from "@/features/run/runner-store";

/** Health + slot usage, styled like a shell prompt status segment. */
export function StatusLine() {
  const healthy = useServerStore((s) => s.healthy);
  const inflight = useRunnerStore((s) => s.inflight);

  const label = healthy === null ? "checking" : healthy ? "online" : "offline";

  return (
    <div className="hidden items-center gap-3 font-mono text-xs text-muted-foreground md:flex">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            healthy === null ? "bg-muted-foreground" : healthy ? "bg-success" : "bg-destructive",
          )}
        />
        {label}
      </span>
      <span aria-label={`${inflight} of ${MAX_CONCURRENT} slots in use`}>
        {inflight}/{MAX_CONCURRENT} slots
      </span>
    </div>
  );
}
