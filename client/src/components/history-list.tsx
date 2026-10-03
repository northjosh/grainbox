import { ChevronRight, Clock } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { OUTCOME_META } from '@/lib/snippets'
import { useHistoryStore, useRunnerStore } from '@/lib/store'

export function HistoryList() {
  const entries = useHistoryStore((s) => s.entries)
  const load = useRunnerStore((s) => s.load)

  if (entries.length === 0) {
    return (
      <div className="grid place-items-center gap-1 py-10 text-center">
        <Clock className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">No runs yet</p>
        <p className="text-sm text-muted-foreground">
          Finished runs show up here.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[28rem]">
      <ul className="divide-y">
        {entries.map((entry) => {
          const meta = OUTCOME_META[entry.result.outcome]
          const EntryIcon = meta.icon

          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() =>
                  load(entry.image, entry.command, entry.result)
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <EntryIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">
                    {entry.command}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.image} · {(entry.result.durationMs / 1000).toFixed(2)}s
                    · {meta.label}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}