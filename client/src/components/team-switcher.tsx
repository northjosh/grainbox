"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  name: string;
  logo: React.ReactNode;
  plan: string;
}

interface TeamSwitcherProps {
  teams: Team[];
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const [currentTeam, setCurrentTeam] = React.useState(teams[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors",
            "group",
          )}
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-muted">
            {currentTeam.logo}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{currentTeam.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTeam.plan}</p>
          </div>
          <ChevronDownIcon className="size-4 text-muted-foreground group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.name}
            onClick={() => setCurrentTeam(team)}
            className={cn(
              "flex items-center gap-2",
              currentTeam === team && "bg-primary text-primary-foreground",
            )}
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              {team.logo}
            </div>
            <div className="flex-1">
              <p className="font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.plan}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
