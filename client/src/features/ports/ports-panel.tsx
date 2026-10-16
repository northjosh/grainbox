import { Loader2, RefreshCw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { portHref } from "./port-url";
import { useSandboxPorts } from "./use-sandbox-ports";

/**
 * Exposed and detected ports for a sandbox. Detected ports are also announced
 * with a toast (see useSandboxPorts); ignoring the toast leaves them here.
 */
export function PortsPanel({ sandboxName }: { sandboxName: string }) {
  const { ports, detected, scanning, working, error, rescan, expose, close } =
    useSandboxPorts(sandboxName);

  const empty = ports.length === 0 && detected.length === 0;

  return (
    <section aria-label="Ports" className="h-fit rounded-md border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">ports</span>
        {scanning ? (
          <span className="font-mono text-xs text-muted-foreground/70">scanning…</span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground/70">every 30s</span>
        )}
        <button
          type="button"
          onClick={rescan}
          title="Scan for ports now"
          aria-label="Scan for ports now"
          className="ml-auto rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
        >
          <RefreshCw className={cn(scanning && "animate-spin")} />
        </button>
      </div>

      <div className="grid gap-0.5 p-3 font-mono text-xs">
        {empty ? (
          <p className="py-2 text-muted-foreground/70">
            no ports yet — new listeners show up here automatically
          </p>
        ) : null}

        {ports.map((port) => {
          const href = portHref(port.url);
          return (
            <div key={port.id} className="flex items-center gap-2 py-1">
              <span className="text-foreground">{port.number}</span>
              <span className="text-success">exposed</span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {port.url}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void close(port)}
                disabled={working !== null}
                title={`Close port ${port.number}`}
                aria-label={`Close port ${port.number}`}
                className="ml-auto rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40 [&_svg]:size-3.5"
              >
                {working === port.id ? <Loader2 className="animate-spin" /> : <X />}
              </button>
            </div>
          );
        })}

        {detected.map((port) => (
          <div key={port} className="flex items-center gap-2 py-1">
            <span className="text-foreground">{port}</span>
            <span className="text-warning">detected</span>
            <button
              type="button"
              onClick={() => void expose(port)}
              disabled={working !== null}
              className="ml-auto text-success underline-offset-4 hover:underline disabled:opacity-40"
            >
              {working === port ? "exposing…" : "expose"}
            </button>
          </div>
        ))}

        {error ? <p className="pt-1 text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
