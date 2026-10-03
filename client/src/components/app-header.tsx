import { Terminal } from 'lucide-react'

import { AccountMenu } from '@/components/account-menu'
import { HealthBadge } from '@/components/health-badge'
import { SlotsBadge } from '@/components/slots-badge'
import { ThemeToggle } from '@/components/theme-toggle'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Terminal className="size-4" />
        </div>
        <div className="mr-auto">
          <p className="text-sm leading-none font-semibold">sandbox</p>
          <p className="text-xs leading-none text-muted-foreground">
            microVM command runner
          </p>
        </div>

        <HealthBadge />
        <SlotsBadge />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  )
}