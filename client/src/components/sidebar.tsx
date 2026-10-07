import { Link, useLocation } from '@tanstack/react-router'
import {
  Activity,
  History,
  LayoutDashboard,
  Terminal,
  X,
} from 'lucide-react'

import { AccountMenu } from '@/components/account-menu'
import { HealthBadge } from '@/components/health-badge'
import { SlotsBadge } from '@/components/slots-badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SidebarProps {
  open: boolean
  onClose: () => void
  className?: string
}

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/runs',
    label: 'Runs',
    icon: History,
    exact: true,
  },
] as const

export function Sidebar({ open, onClose, className }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            onClick={() => onClose()}
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
              <Terminal className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Sandbox</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => onClose()}
                className={cn(
                  'group/button inline-flex h-9 w-full shrink-0 items-center justify-start gap-3 rounded-md border border-transparent bg-clip-padding px-3 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'hover:bg-muted hover:text-foreground',
                  isActive && 'font-medium',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
            <AccountMenu />
          </div>
        </div>

        {/* Status at the bottom of the sidebar */}
        <div className="mt-6 space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <Activity className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge />
            <SlotsBadge />
          </div>
        </div>
      </aside>
    </>
  )
}