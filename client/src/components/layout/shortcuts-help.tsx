import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Keyboard, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isTypingTarget } from "@/lib/hotkeys";

const SECTIONS = [
  {
    title: "go to",
    shortcuts: [
      { label: "run", keys: ["g", "r"] },
      { label: "runs", keys: ["g", "h"] },
      { label: "sandboxes", keys: ["g", "b"] },
      { label: "snapshots", keys: ["g", "s"] },
    ],
  },
  {
    title: "run page",
    shortcuts: [
      { label: "run command", keys: ["⌘/Ctrl", "↵"] },
      { label: "cancel", keys: ["esc"] },
    ],
  },
  {
    title: "sandboxes",
    shortcuts: [
      { label: "new sandbox", keys: ["n"] },
      { label: "focus search", keys: ["/"] },
      { label: "clear search", keys: ["esc"] },
    ],
  },
  {
    title: "anywhere",
    shortcuts: [
      { label: "command menu", keys: ["⌘/Ctrl", "k"] },
      { label: "show shortcuts", keys: ["?"] },
    ],
  },
] as const;

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      e.preventDefault();
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          />
        }
      >
        <Keyboard />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-5 font-mono shadow-lg outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-sm font-medium">keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                ignored while typing in a field or terminal
              </Dialog.Description>
            </div>
            <Dialog.Close
              title="Close"
              aria-label="Close"
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
            >
              <X />
            </Dialog.Close>
          </div>

          <div className="mt-5 grid gap-4">
            {SECTIONS.map((section) => (
              <section key={section.title} className="grid gap-1.5">
                <h2 className="text-xs text-muted-foreground">{section.title}</h2>
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between gap-4 text-xs"
                  >
                    <span>{shortcut.label}</span>
                    <span className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
