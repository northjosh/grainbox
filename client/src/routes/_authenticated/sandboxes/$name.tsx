import { createFileRoute, Link } from "@tanstack/react-router";

import { PortsPanel } from "@/features/ports/ports-panel";
import { XtermView } from "@/features/terminal/xterm-view";

export const Route = createFileRoute("/_authenticated/sandboxes/$name")({
  component: SandboxTerminalPage,
});

function SandboxTerminalPage() {
  const { name } = Route.useParams();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="flex items-baseline gap-3">
        <Link
          to="/sandboxes"
          className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← sandboxes
        </Link>
        <h1 className="min-w-0 truncate font-mono text-sm font-medium">{name}</h1>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-terminal">
          <XtermView key={name} sandboxName={name} />
        </div>

        <div className="lg:sticky lg:top-16">
          <PortsPanel sandboxName={name} />
        </div>
      </div>
    </div>
  );
}
