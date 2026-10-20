import { Link } from "@tanstack/react-router";
import { Loader2, Play, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatResources } from "@/lib/resources";
import type { PersistentSandbox } from "@/lib/api";

type SandboxListProps = {
  sandboxes: PersistentSandbox[];
  loading: boolean;
  working: string | null;
  searchQuery?: string;
  onStart: (sandbox: PersistentSandbox) => void;
  onStop: (sandbox: PersistentSandbox) => void;
  onDelete: (sandbox: PersistentSandbox) => void;
};

function formatCreated(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function SandboxList({
  sandboxes,
  loading,
  working,
  searchQuery = "",
  onStart,
  onStop,
  onDelete,
}: SandboxListProps) {
  if (loading && sandboxes.length === 0) {
    return <p className="py-6 text-center font-mono text-sm text-muted-foreground">loading…</p>;
  }

  if (sandboxes.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-sm text-muted-foreground">
        {searchQuery
          ? `no sandboxes match “${searchQuery}”`
          : "no sandboxes yet — create one with + new"}
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left font-mono text-xs text-muted-foreground">
          <th className="py-2 pr-4 font-normal">name</th>
          <th className="py-2 pr-4 font-normal">image</th>
          <th className="py-2 pr-4 font-normal">resources</th>
          <th className="py-2 pr-4 font-normal">status</th>
          <th className="py-2 pr-4 font-normal">created</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody className="divide-y border-t">
        {sandboxes.map((sandbox) => {
          const running = sandbox.status === "running";
          const busy = working?.endsWith(sandbox.id) ?? false;
          const label = sandbox.name ?? "sandbox";

          return (
            <tr key={sandbox.id}>
              <td className="py-2.5 pr-4">
                {sandbox.name ? (
                  <Link
                    to="/sandboxes/$name"
                    params={{ name: sandbox.name }}
                    className="font-mono underline-offset-4 hover:underline"
                  >
                    {sandbox.name}
                  </Link>
                ) : (
                  <span className="font-mono text-muted-foreground">unnamed</span>
                )}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                {sandbox.image ?? "—"}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                {formatResources(sandbox.cpu, sandbox.memory)}
              </td>
              <td className="py-2.5 pr-4">
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      running ? "bg-success" : "bg-muted-foreground",
                    )}
                  />
                  {sandbox.status ?? "unknown"}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                {formatCreated(sandbox.createdAt)}
              </td>
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={running ? `Stop ${label}` : `Start ${label}`}
                    aria-label={running ? `Stop ${label}` : `Start ${label}`}
                    disabled={!sandbox.name || working !== null}
                    onClick={() => (running ? onStop(sandbox) : onStart(sandbox))}
                    className={cn(
                      running
                        ? "hover:bg-warning/10 [&_svg]:text-warning"
                        : "hover:bg-success/10 [&_svg]:text-success",
                    )}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : running ? <Square /> : <Play />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={`Delete ${label}`}
                    aria-label={`Delete ${label}`}
                    disabled={working !== null}
                    onClick={() => onDelete(sandbox)}
                    className="hover:bg-destructive/10 [&_svg]:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
