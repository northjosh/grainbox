import { Loader2, Server } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useServerStore } from '@/lib/store'

export function HealthBadge() {
  const healthy = useServerStore((s) => s.healthy)

  return (
    <Badge
      variant={
        healthy === null ? 'secondary' : healthy ? 'success' : 'destructive'
      }
      className="gap-1.5"
    >
      {healthy === null ? <Loader2 className="animate-spin" /> : <Server />}
      {healthy === null ? 'checking' : healthy ? 'online' : 'offline'}
    </Badge>
  )
}