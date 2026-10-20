import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  Box,
  Camera,
  Command as CommandIcon,
  History,
  LogOut,
  Moon,
  Play,
  Plus,
  Search,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { useThemeStore } from "@/lib/store/theme-store";

const NAV_ITEMS = [
  { to: "/", label: "run", shortcut: "g r", icon: Play },
  { to: "/runs", label: "runs", shortcut: "g h", icon: History },
  { to: "/sandboxes", label: "sandboxes", shortcut: "g b", icon: Box },
  { to: "/snapshots", label: "snapshots", shortcut: "g s", icon: Camera },
] as const;

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground";
const GROUP_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  async function signOut() {
    await authClient.logout();
    await router.invalidate();
    void navigate({ to: "/login" });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Command menu (⌘K)"
            aria-label="Command menu"
          />
        }
      >
        <CommandIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-[12%] left-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 overflow-hidden rounded-md border bg-background shadow-lg outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Command label="Command menu" loop className="font-mono">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="type a command or search…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                esc
              </kbd>
            </div>

            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
                no results
              </Command.Empty>

              <Command.Group heading="go to" className={GROUP_CLASS}>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.to}
                      value={item.label}
                      onSelect={() => run(() => void navigate({ to: item.to }))}
                      className={ITEM_CLASS}
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                      {item.label}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {item.shortcut}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>

              <Command.Group heading="actions" className={GROUP_CLASS}>
                <Command.Item
                  value="new sandbox"
                  onSelect={() =>
                    run(() => void navigate({ to: "/sandboxes", search: { new: true } }))
                  }
                  className={ITEM_CLASS}
                >
                  <Plus className="size-3.5 text-muted-foreground" />
                  new sandbox
                  <span className="ml-auto text-[10px] text-muted-foreground">n</span>
                </Command.Item>
                <Command.Item
                  value={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}
                  className={ITEM_CLASS}
                >
                  {theme === "dark" ? (
                    <Sun className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Moon className="size-3.5 text-muted-foreground" />
                  )}
                  switch to {theme === "dark" ? "light" : "dark"} mode
                </Command.Item>
                <Command.Item
                  value="sign out"
                  onSelect={() => run(() => void signOut())}
                  className={ITEM_CLASS}
                >
                  <LogOut className="size-3.5 text-muted-foreground" />
                  sign out
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
