import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { XtermView } from "./xterm-view";

type TerminalTab = {
  id: number;
  name: string;
};

/** Multiple shell sessions over the same sandbox, kept alive across tab switches. */
export function TerminalTabs({
  sandboxName,
  enabled,
}: {
  sandboxName: string;
  enabled: boolean;
}) {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: 1, name: "shell 1" }]);
  const [active, setActive] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const nextIdRef = useRef(2);

  function addTab() {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setTabs((current) => [...current, { id, name: `shell ${id}` }]);
    setActive(id);
  }

  function closeTab(id: number) {
    if (tabs.length === 1) return;
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (active === id) setActive(next[next.length - 1].id);
    if (editing === id) setEditing(null);
  }

  function startRename(tab: TerminalTab) {
    setEditing(tab.id);
    setDraft(tab.name);
  }

  function commitRename() {
    if (editing === null) return;
    const name = draft.trim();
    if (name) {
      setTabs((current) => current.map((tab) => (tab.id === editing ? { ...tab, name } : tab)));
    }
    setEditing(null);
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "flex shrink-0 items-center rounded-sm font-mono text-xs transition-colors",
              tab.id === active
                ? "bg-white/5 text-terminal-foreground"
                : "text-terminal-foreground/50 hover:text-terminal-foreground",
            )}
          >
            {editing === tab.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitRename();
                  else if (event.key === "Escape") setEditing(null);
                }}
                spellCheck={false}
                aria-label="Rename shell"
                className="w-24 bg-transparent py-1 pl-2 text-terminal-foreground outline-none"
              />
            ) : (
              <button
                type="button"
                className="py-1 pr-1 pl-2"
                onClick={() => setActive(tab.id)}
                onDoubleClick={() => startRename(tab)}
                title="Double-click to rename"
                aria-pressed={tab.id === active}
              >
                {tab.name}
              </button>
            )}
            {tabs.length > 1 ? (
              <button
                type="button"
                title={`Close ${tab.name}`}
                aria-label={`Close ${tab.name}`}
                onClick={() => closeTab(tab.id)}
                className="py-1 pr-1.5 pl-0.5 transition-colors hover:text-destructive [&_svg]:size-3"
              >
                <X />
              </button>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          title="New shell"
          aria-label="New shell"
          onClick={addTab}
          className="ml-1 shrink-0 rounded-sm p-1 text-terminal-foreground/50 transition-colors hover:text-terminal-foreground [&_svg]:size-3.5"
        >
          <Plus />
        </button>
      </div>

      {tabs.map((tab) => (
        <div key={tab.id} className={cn("min-w-0", tab.id === active ? "block" : "hidden")}>
          <XtermView
            sandboxName={sandboxName}
            tabId={tab.id}
            enabled={enabled}
            active={tab.id === active}
          />
        </div>
      ))}
    </div>
  );
}
