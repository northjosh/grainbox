import { useState } from "react";
import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { Camera, Plug, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogsPanel } from "@/features/logs/logs-panel";
import { PortsPanel } from "@/features/ports/ports-panel";
import { useSandboxPorts } from "@/features/ports/use-sandbox-ports";
import { SnapshotsPanel } from "@/features/snapshots/snapshots-panel";
import { LeaveTerminalDialog } from "@/features/terminal/leave-terminal-dialog";
import { TerminalTabs } from "@/features/terminal/terminal-tabs";
import { useActiveTerminalCount } from "@/features/terminal/terminal-activity-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sandboxes/$name")({
  component: SandboxTerminalPage,
});

function SandboxTerminalPage() {
  const { name } = Route.useParams();
  const [showPorts, setShowPorts] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const ports = useSandboxPorts(name);
  const showAside = showPorts || showLogs || showSnapshots;

  const activeTerminals = useActiveTerminalCount();
  const blocker = useBlocker({
    shouldBlockFn: () => true,
    withResolver: true,
    disabled: activeTerminals === 0,
    enableBeforeUnload: activeTerminals > 0,
  });

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

        <div className="ml-auto flex items-center gap-1">
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

      <div
        className={cn("grid items-start gap-4", showAside && "lg:grid-cols-[minmax(0,1fr)_18rem]")}
      >
        <div className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-terminal">
          <TerminalTabs key={name} sandboxName={name} />
        </div>

        {showAside ? (
          <div className="grid gap-4 lg:sticky lg:top-16">
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
