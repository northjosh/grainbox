import { createFileRoute } from '@tanstack/react-router'

import { HistoryList } from '@/components/history-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/runs')({
  component: RunsPage,
})

function RunsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Runs</h2>
        <p className="text-sm text-muted-foreground">
          All sandbox runs and their history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>Your last runs are persisted locally.</CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryList />
        </CardContent>
      </Card>
    </div>
  )
}
