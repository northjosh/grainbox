import { useEffect } from "react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { TopNav } from "@/components/layout/top-nav";
import { useNavHotkeys } from "@/components/layout/use-nav-hotkeys";
import { useServerStore } from "@/lib/store/server-store";

/**
 * Guards every signed-in route. The session check lives in `beforeLoad` so
 * navigation blocks until it resolves and anonymous visitors are redirected
 * before any protected component renders.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = Route.useRouteContext();
  const checkHealth = useServerStore((s) => s.check);
  useNavHotkeys();

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => {
      void checkHealth();
    }, 10_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  return (
    <div className="min-h-screen">
      <TopNav session={session} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
