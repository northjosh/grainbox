import { useEffect } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppHeader } from '@/components/app-header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useServerStore, useSessionStore } from '@/lib/store'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

/**
 * Pathless layout guarding every signed-in route. It owns the session check,
 * the server health poll and the redirect, so child routes can assume a valid
 * session and just render their own content into the outlet.
 */
function AuthenticatedLayout() {
  const status = useSessionStore((s) => s.status)
  const checkSession = useSessionStore((s) => s.check)
  const checkServer = useServerStore((s) => s.check)
  const navigate = useNavigate()

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    const controller = new AbortController()
    void checkServer(controller.signal)
    return () => controller.abort()
  }, [checkServer])

  useEffect(() => {
    if (status === 'anonymous') {
      void navigate({ to: '/login', replace: true })
    }
  }, [status, navigate])

  // Hold rendering until the first check settles, otherwise children flash
  // before the redirect fires.
  if (status === 'checking') return null

  return (
    <TooltipProvider delay={200}>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-6 lg:grid-cols-[22rem_1fr]">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}