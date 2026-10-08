import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { Menu, TerminalSquare } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useServerStore, useSessionStore } from "@/lib/store";

/**
 * Authenticated dashboard layout. Guards all signed-in routes and provides
 * a fixed sidebar on the left, a top bar, and an Outlet for nested routes.
 */
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  beforeLoad: () => {
    // check session
  },
  loader: () => <div>Loading...</div>,
});

function AuthenticatedLayout() {
  const status = useSessionStore((s) => s.status);
  const checkSession = useSessionStore((s) => s.check);
  const navigate = useNavigate();
  const checkHealth = useServerStore((s) => s.check);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (status === "anonymous") {
      void navigate({ to: "/login" });
    }
  }, [status, navigate]);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => {
      void checkHealth();
    }, 10_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TerminalSquare className="size-4 animate-pulse" />
          Checking session…
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b bg-background/95 supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">Dashboard</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-16">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
