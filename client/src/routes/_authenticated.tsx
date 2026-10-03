import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { Menu, Terminal } from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { useServerStore, useSessionStore } from '@/lib/store'

/**
 * Authenticated dashboard layout. Guards all signed-in routes and provides
 * the sidebar shell + top bar.
 */
export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const status = useSessionStore((s) => s.status)
  const checkSession = useSessionStore((s) => s.check)
  const navigate = useNavigate()
  const checkHealth = useServerStore((s) => s.check)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    if (status === 'anonymous') {
      void navigate({ to: '/login' })
    }
  }, [status, navigate])

  useEffect(() => {
    void checkHealth()
    const id = setInterval(() => {
      void checkHealth()
    }, 10_000)
    return () => clearInterval(id)
  }, [checkHealth])

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="size-4 animate-pulse" />
          Checking session…
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen w-full flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                Dashboard
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}