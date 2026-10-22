import { useEffect, useState } from "react";
import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  FolderTree,
  Gauge,
  Loader2,
  Pause,
  Play,
  Plug,
  ScrollText,
  Square,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilesPanel } from "@/features/files/files-panel";
import { LogsPanel } from "@/features/logs/logs-panel";
import { MetricsBar } from "@/features/metrics/metrics-bar";
import { PortsPanel } from "@/features/ports/ports-panel";
import { useSandboxPorts } from "@/features/ports/use-sandbox-ports";
import { useSandbox } from "@/features/sandboxes/use-sandbox";
import { SnapshotsPanel } from "@/features/snapshots/snapshots-panel";
import { LeaveTerminalDialog } from "@/features/terminal/leave-terminal-dialog";
import { TerminalStateOverlay } from "@/features/terminal/terminal-state-overlay";
import { TerminalTabs } from "@/features/terminal/terminal-tabs";
import { useActiveTerminalCount } from "@/features/terminal/terminal-activity-store";
import { clearScrollback } from "@/features/terminal/terminal-scrollback";
import { deleteSandbox, pauseSandbox, startSandbox, stopSandbox } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatResources } from "@/lib/resources";

export const Route = createFileRoute("/_authenticated/sandboxes/$name")({
  component: SandboxTerminalPage,
});

function SandboxTerminalPage() {
  const { name } = Route.useParams();
  const [showFiles, setShowFiles] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [working, setWorking] = useState<"start" | "pause" | "stop" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const ports = useSandboxPorts(name);
  const { sandbox, refresh } = useSandbox(name);
  const navigate = useNavigate();
  const showAside = showFiles || showPorts || showLogs || showSnapshots;

  const activeTerminals = useActiveTerminalCount();
  const lifecycle = sandbox?.status ?? (activeTerminals > 0 ? "running" : "unknown");
  const running = lifecycle === "running";
  const paused = lifecycle === "paused";
  const details = sandbox
    ? `${sandbox.image ?? "unknown"} · ${formatResources(sandbox.cpu, sandbox.memory)}`
    : undefined;

  const blocker = useBlocker({
    shouldBlockFn: () => true,
    withResolver: true,
    disabled: activeTerminals === 0 || deleted,
    enableBeforeUnload: activeTerminals > 0,
  });

  useEffect(() => {
    setWorking(null);
    setActionError(null);
    setDeleted(false);
  }, [name]);

  useEffect(() => {
    if (!deleted) return;
    void navigate({ to: "/sandboxes", replace: true });
  }, [deleted, navigate]);

  async function handleStart() {
    if (working) return;
    setWorking("start");
    setActionError(null);
    try {
      await startSandbox(name);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking(null);
    }
  }

  async function handlePause() {
    if (working) return;
    setWorking("pause");
    setActionError(null);
    try {
      await pauseSandbox(name);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking(null);
    }
  }

  async function handleStop() {
    if (working) return;
    setWorking("stop");
    setActionError(null);
    try {
      await stopSandbox(name);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorking(null);
    }
  }

  async function handleDelete() {
    if (working) return;
    setWorking("delete");
    setActionError(null);
    try {
      await deleteSandbox(name);
      clearScrollback(name);
      setDeleted(true);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
      setWorking(null);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="flex items-center gap-3">
        <Link
          to="/sandboxes"
          className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← sandboxes
        </Link>
        <h1 className="min-w-0 truncate font-mono text-sm font-medium">{name}</h1>
        {sandbox ? (
          <span className="hidden min-w-0 truncate font-mono text-xs text-muted-foreground sm:inline">
            {sandbox.image ?? "—"} · {formatResources(sandbox.cpu, sandbox.memory)}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {running ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={`Pause ${name}`}
              aria-label={`Pause ${name}`}
              disabled={working !== null}
              onClick={() => void handlePause()}
            >
              {working === "pause" ? <Loader2 className="animate-spin" /> : <Pause />}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={paused ? `Resume ${name}` : `Start ${name}`}
              aria-label={paused ? `Resume ${name}` : `Start ${name}`}
              disabled={working !== null}
              onClick={() => void handleStart()}
              className="hover:bg-success/10 [&_svg]:text-success"
            >
              {working === "start" ? <Loader2 className="animate-spin" /> : <Play />}
            </Button>
          )}
          {running || paused ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={`Stop ${name}`}
              aria-label={`Stop ${name}`}
              disabled={working !== null}
              onClick={() => void handleStop()}
              className="hover:bg-warning/10 [&_svg]:text-warning"
            >
              {working === "stop" ? <Loader2 className="animate-spin" /> : <Square />}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={`Delete ${name}`}
            aria-label={`Delete ${name}`}
            disabled={working !== null}
            onClick={() => void handleDelete()}
            className="hover:bg-destructive/10 [&_svg]:text-destructive"
          >
            {working === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            aria-pressed={showMetrics}
            title={showMetrics ? "Hide metrics" : "Show metrics"}
            onClick={() => setShowMetrics((value) => !value)}
          >
            <Gauge />
            metrics
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            aria-pressed={showFiles}
            title={showFiles ? "Hide files" : "Show files"}
            onClick={() => setShowFiles((value) => !value)}
          >
            <FolderTree />
            files
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            aria-pressed={showPorts}
            title={showPorts ? "Hide ports" : "Show ports"}
            onClick={() => setShowPorts((value) => !value)}
          >
            <Plug />
            ports
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            aria-pressed={showSnapshots}
            title={showSnapshots ? "Hide snapshots" : "Show snapshots"}
            onClick={() => setShowSnapshots((value) => !value)}
          >
            <Camera />
            snapshots
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            aria-pressed={showLogs}
            title={showLogs ? "Hide logs" : "Show logs"}
            onClick={() => setShowLogs((value) => !value)}
          >
            <ScrollText />
            logs
          </Button>
        </div>
      </header>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      <div
        className={cn("grid items-start gap-4", showAside && "lg:grid-cols-[minmax(0,1fr)_18rem]")}
      >
        <div className="relative min-w-0 overflow-hidden rounded-md border border-white/10 bg-terminal">
          {showMetrics && activeTerminals > 0 && !paused ? (
            <MetricsBar sandboxName={name} memoryLimitMib={sandbox?.memory ?? null} />
          ) : null}
          <TerminalTabs
            key={name}
            sandboxName={name}
            details={details}
            enabled={running}
          />
          {running ? null : (
            <TerminalStateOverlay
              status={lifecycle}
              pending={working === "start"}
              onStart={() => void handleStart()}
            />
          )}
        </div>

        {showAside ? (
          <div className="grid gap-4 lg:sticky lg:top-16">
            {showFiles ? (
              <FilesPanel
                sandboxName={name}
                enabled={running}
                onClose={() => setShowFiles(false)}
              />
            ) : null}
            {showPorts ? <PortsPanel {...ports} onClose={() => setShowPorts(false)} /> : null}
            {showSnapshots ? (
              <SnapshotsPanel sandboxName={name} onClose={() => setShowSnapshots(false)} />
            ) : null}
            {showLogs ? <LogsPanel sandboxName={name} onClose={() => setShowLogs(false)} /> : null}
          </div>
        ) : null}
      </div>

      <LeaveTerminalDialog
        open={blocker.status === "blocked"}
        sessionCount={activeTerminals}
        onLeave={() => blocker.proceed?.()}
        onStay={() => blocker.reset?.()}
      />
    </div>
  );
}
