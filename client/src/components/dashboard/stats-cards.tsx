import { Activity, Clock, History, Server } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_CONCURRENT } from "@/lib/api";
import { useHistoryStore, useRunnerStore, useServerStore, useSessionStore } from "@/lib/store";

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}

export function StatsCards() {
  const healthy = useServerStore((s) => s.healthy);
  const status = useSessionStore((s) => s.status);
  const entries = useHistoryStore((s) => s.entries);
  const inflight = useRunnerStore((s) => s.inflight);

  const ok = healthy;
  const maxConcurrent = MAX_CONCURRENT;
  const running = inflight;

  const totalRuns = entries.length;
  const successful = entries.filter((e) => e.result.outcome === "success").length;
  const failed = totalRuns - successful;
  const successRate = totalRuns === 0 ? 0 : Math.round((successful / totalRuns) * 100);

  const lastRun = entries[0];
  const lastDuration = lastRun?.result.durationMs;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Server</CardTitle>
          <Server className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ok ? "Online" : "Offline"}</div>
          <p className="text-xs text-muted-foreground">
            Health check • {status === "authenticated" ? "signed in" : status}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Concurrent Slots</CardTitle>
          <Activity className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {running}/{maxConcurrent}
          </div>
          <p className="text-xs text-muted-foreground">Currently running microVMs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          <History className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalRuns}</div>
          <p className="text-xs text-muted-foreground">
            {successful} success • {failed} failed • {successRate}% success
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Run</CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {lastRun ? formatDuration(lastDuration ?? 0) : "—"}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {lastRun ? lastRun.command || lastRun.image : "No runs yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
