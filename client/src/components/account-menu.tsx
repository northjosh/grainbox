import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store";

/**
 * The session cookie is httpOnly, so the displayed name and email come from
 * the copy cached at login time. Signing out flips the store to `anonymous`,
 * which is what the authenticated layout watches to redirect.
 */
export function AccountMenu() {
  const identity = useSessionStore((s) => s.identity);
  const signOut = useSessionStore((s) => s.signOut);

  if (!identity) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 font-normal" aria-label="Account" />
        }
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
          {identity.name.slice(0, 2)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{identity.email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Base UI's GroupLabel requires a Menu.Group ancestor. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm">{identity.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{identity.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
