import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, RefreshCw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SandboxCreateSheet } from "@/features/sandboxes/sandbox-create-sheet";
import { SandboxList } from "@/features/sandboxes/sandbox-list";
import { useSandboxes } from "@/features/sandboxes/use-sandboxes";
import { isTypingTarget } from "@/lib/hotkeys";

export const Route = createFileRoute("/_authenticated/sandboxes/")({
  validateSearch: (search: Record<string, unknown>): { new?: boolean } =>
    search.new === "1" || search.new === true ? { new: true } : {},
  component: SandboxesPage,
});

function SandboxesPage() {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const { sandboxes, loading, working, error, refresh, start, pause, stop, remove } =
    useSandboxes(query);
  const navigate = useNavigate();
  const { new: newSandbox } = Route.useSearch();

  useEffect(() => {
    if (!newSandbox) return;
    setCreateOpen(true);
    void navigate({ to: "/sandboxes", search: {}, replace: true });
  }, [newSandbox, navigate]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape" && !createOpen) {
        if (query) {
          setQuery("");
          searchRef.current?.blur();
        }
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key.toLowerCase() === "n" && !createOpen) {
        e.preventDefault();
        setCreateOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, query]);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div className="flex items-end justify-between gap-4">
        <header className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">sandboxes</h1>
          <p className="text-sm text-muted-foreground">
            Persistent VMs that keep their disk between commands.
          </p>
        </header>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-mono"
            title="New sandbox (n)"
            onClick={() => setCreateOpen(true)}
          >
            <Plus />
            new
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-mono"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search sandboxes…"
          title="Focus search (/)"
          autoComplete="off"
          spellCheck={false}
          className="pr-8 pl-8 font-mono"
        />
        {query ? (
          <button
            type="button"
            title="Clear search"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
          >
            <X />
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <SandboxList
        sandboxes={sandboxes}
        loading={loading}
        working={working}
        searchQuery={query.trim()}
        onStart={(s) => void start(s)}
        onPause={(s) => void pause(s)}
        onStop={(s) => void stop(s)}
        onDelete={(s) => void remove(s)}
      />

      <SandboxCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(name) => {
          setCreateOpen(false);
          void navigate({ to: "/sandboxes/$name", params: { name } });
        }}
      />
    </div>
  );
}
