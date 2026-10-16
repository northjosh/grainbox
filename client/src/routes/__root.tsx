import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import { Toaster } from "@/components/ui/sonner";
import type { RouterContext } from "@/router";
import "../styles.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
      {import.meta.env.DEV ? (
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      ) : null}
    </>
  );
}

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-content-center gap-2 text-center">
      <p className="font-mono text-sm text-muted-foreground">404 — no such page</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        back to /
      </Link>
    </div>
  );
}
