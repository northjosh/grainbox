import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore } from "@/lib/store";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />}
      >
        {theme === "dark" ? <Moon /> : <Sun />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun />
          Light
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
