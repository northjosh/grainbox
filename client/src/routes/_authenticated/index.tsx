import { createFileRoute } from '@tanstack/react-router'

import { OutputPanel } from '@/components/output-panel'
import { RunForm } from '@/components/run-form'

export const Route = createFileRoute('/_authenticated/')({
  component: RunnerRoute,
})

function RunnerRoute() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <RunForm />
      </div>
      <OutputPanel />
    </>
  )
}