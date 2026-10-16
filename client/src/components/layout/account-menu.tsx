import { useNavigate, useRouter } from "@tanstack/react-router";
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
import { authClient, type Identity } from "@/features/auth/auth-client";

export function AccountMenu({ identity }: { identity: Identity | null }) {
  const router = useRouter();
  const navigate = useNavigate();

  if (!identity) return null;

  async function signOut() {
    await authClient.logout();
    await router.invalidate();
    void navigate({ to: "/login" });
  }

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
