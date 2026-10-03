import { MAX_CONCURRENT } from '@/lib/api'
import { useRunnerStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'

export function SlotsBadge() {
  const inflight = useRunnerStore((s) => s.inflight)

  return (
    <Badge variant="outline" className="font-mono">
      {inflight}/{MAX_CONCURRENT} slots
    </Badge>
  )
}