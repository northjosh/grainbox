"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface NavUserProps {
  user: User;
}

export function NavUser({ user }: NavUserProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-muted transition-colors",
          )}
        >
          <Avatar className="size-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center gap-2 px-2 py-1">
          <UserIcon className="size-4" />
          <div className="flex-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <SettingsIcon className="size-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOutIcon className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
