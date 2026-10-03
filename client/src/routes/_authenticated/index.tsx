import { createFileRoute } from '@tanstack/react-router'
import { Activity, Terminal } from 'lucide-react'

import { HistoryList } from '@/components/history-list'
import { OutputPanel } from '@/components/output-panel'
import { RunForm } from '@/components/run-form'
import { StatsCards } from '@/components/dashboard/stats-cards'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useRunHotkeys } from '@/lib/use-run-hotkeys'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardHome,
})

function DashboardHome() {
  useRunHotkeys()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Sandbox Runner
        </h2>
        <p className="text-sm text-muted-foreground">
          Spin up ephemeral microVMs and run commands in isolated environments.
        </p>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="size-4" />
              Quick Run
            </CardTitle>
            <CardDescription>
              Choose an image and run a command.{' '}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">
                ⌘/Ctrl+Enter
              </kbd>{' '}
              to run,{' '}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">
                Esc
              </kbd>{' '}
              to cancel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RunForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Recent Runs
            </CardTitle>
            <CardDescription>
              Your last runs are persisted locally.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            <HistoryList />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
          <CardDescription>
            Live stdout/stderr and run status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OutputPanel />
        </CardContent>
      </Card>
    </div>
  )
}