import { cn } from "@/lib/utils";
import { formatBytes, formatUptime } from "@/lib/resources";
import { useLiveMetrics, type LiveMetrics } from "./use-live-metrics";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-terminal-foreground/45">{label}</span>
      <span className="text-terminal-foreground">{value}</span>
    </span>
  );
}

function memoryValue(metrics: LiveMetrics | null, limitBytes: number | null): string {
  if (!metrics) return "—";
  if (limitBytes == null) return formatBytes(metrics.memory);
  return `${formatBytes(metrics.memory)} / ${formatBytes(limitBytes)}`;
}

export function MetricsBar({
  sandboxName,
  memoryLimitMib,
}: {
  sandboxName: string;
  memoryLimitMib: number | null;
}) {
  const { metrics, status } = useLiveMetrics(sandboxName);
  const limitBytes = memoryLimitMib == null ? null : memoryLimitMib * 1024 * 1024;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 px-3 py-1.5 font-mono text-[11px]">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            status === "open"
              ? "bg-success"
              : status === "closed"
                ? "bg-destructive"
                : "bg-terminal-foreground/30",
          )}
        />
        <span className="text-terminal-foreground/45">
          {status === "open" ? "live metrics" : status === "closed" ? "metrics offline" : "metrics…"}
        </span>
      </span>

      <Metric label="cpu" value={metrics ? `${metrics.cpu.toFixed(1)}%` : "—"} />
      <Metric label="mem" value={memoryValue(metrics, limitBytes)} />
      <Metric
        label="disk"
        value={
          metrics
            ? `r ${formatBytes(metrics.diskReadBytes)} · w ${formatBytes(metrics.diskWriteBytes)}`
            : "—"
        }
      />
      <Metric
        label="net"
        value={
          metrics
            ? `rx ${formatBytes(metrics.networkRx)} · tx ${formatBytes(metrics.networkTx)}`
            : "—"
        }
      />
      <span className="ml-auto flex items-center gap-1.5">
        <span className="text-terminal-foreground/45">up</span>
        <span className="text-terminal-foreground">
          {metrics ? formatUptime(metrics.uptime) : "—"}
        </span>
      </span>
    </div>
  );
}
