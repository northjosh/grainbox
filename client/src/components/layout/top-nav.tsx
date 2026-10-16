import { Link } from "@tanstack/react-router";

import { AccountMenu } from "@/components/layout/account-menu";
import { StatusLine } from "@/components/layout/status-line";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Session } from "@/features/auth/auth-client";

const LINKS = [
  { to: "/", label: "run" },
  { to: "/runs", label: "runs" },
  { to: "/sandboxes", label: "sandboxes" },
] as const;

export function TopNav({ session }: { session: Session }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Link to="/" className="font-mono text-sm font-semibold tracking-tight">
          sandbox
        </Link>

        <nav className="flex items-center gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <StatusLine />
          <ThemeToggle />
          <AccountMenu identity={session.identity} />
        </div>
      </div>
    </header>
  );
}
