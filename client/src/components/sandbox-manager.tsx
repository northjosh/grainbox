import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Plus, RefreshCw, Search, Terminal, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IMAGES, createSandbox, deleteSandbox, executeSandboxCommand, listSandboxes } from '@/lib/api'
import type { Image, PersistentSandbox } from '@/lib/api'

type SandboxManagerProps = {
  onOpenTerminal: (sandboxName: string) => void
}

export function SandboxManager({ onOpenTerminal }: SandboxManagerProps) {
  const [sandboxes, setSandboxes] = useState<PersistentSandbox[]>([])
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [image, setImage] = useState<Image>('alpine')
  const [commands, setCommands] = useState<Record<string, string>>({})
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const timer = setTimeout(() => {
      setLoading(true)
      void listSandboxes(query)
        .then((results) => {
          if (current) setSandboxes(results)
        })
        .catch((cause: unknown) => {
          if (current) setError(cause instanceof Error ? cause.message : String(cause))
        })
        .finally(() => {
          if (current) setLoading(false)
        })
    }, 200)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setSandboxes(await listSandboxes(query))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || working) return

    setWorking('create')
    setError(null)
    try {
      await createSandbox(trimmedName, image)
      setName('')
      onOpenTerminal(trimmedName)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setWorking(null)
    }
  }

  async function runCommand(sandbox: PersistentSandbox) {
    if (!sandbox.name) return
    const command = commands[sandbox.id]?.trim()
    if (!command || working) return

    setWorking(`run:${sandbox.id}`)
    setError(null)
    try {
      const stdout = await executeSandboxCommand(sandbox.name, command)
      setOutputs((current) => ({ ...current, [sandbox.id]: stdout }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setWorking(null)
    }
  }

  async function removeSandbox(sandbox: PersistentSandbox) {
    if (!sandbox.name || working) return
    setWorking(`delete:${sandbox.id}`)
    setError(null)
    try {
      await deleteSandbox(sandbox.name)
      setSandboxes((current) => current.filter((item) => item.id !== sandbox.id))
      setOutputs((current) => {
        const next = { ...current }
        delete next[sandbox.id]
        return next
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setWorking(null)
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-3 border-b py-4">
        <div className="flex items-start gap-3">
          <div className="mr-auto space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4" />
              Persistent sandboxes
            </CardTitle>
            <CardDescription>Create and manage up to five saved environments.</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh sandboxes"
            title="Refresh sandboxes"
            onClick={() => void refresh()}
            disabled={loading || working !== null}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </div>

        <form onSubmit={(event) => void onCreate(event)} className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
          <div className="grid gap-1.5">
            <Label htmlFor="sandbox-name">Name</Label>
            <Input
              id="sandbox-name"
              value={name}
              onChange={(event) => setName(event.target.value.toLowerCase())}
              maxLength={31}
              pattern="[a-z0-9][a-z0-9-]{1,30}"
              placeholder="my-sandbox"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sandbox-image">Image</Label>
            <Select value={image} onValueChange={(value) => setImage(value as Image)}>
              <SelectTrigger id="sandbox-image" className="w-full font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGES.map((option) => (
                  <SelectItem key={option} value={option} className="font-mono">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={!name.trim() || working !== null}>
              {working === 'create' ? <Loader2 className="animate-spin" /> : <Plus />}
              Create
            </Button>
          </div>
        </form>
      </CardHeader>

      <CardContent className="grid gap-3 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sandboxes by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            className="pl-9"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : null}

        {loading && sandboxes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading sandboxes…</p>
        ) : sandboxes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {query ? 'No matching sandboxes.' : 'No saved sandboxes yet.'}
          </p>
        ) : (
          <ul className="divide-y">
            {sandboxes.map((sandbox) => {
              const rowBusy = working?.endsWith(sandbox.id) ?? false
              return (
                <li key={sandbox.id} className="grid gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">
                      {sandbox.name ?? 'Unnamed sandbox'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sandbox.image ?? 'image'} · {sandbox.status ?? 'unknown'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sandbox.name && onOpenTerminal(sandbox.name)}
                      disabled={!sandbox.name || working !== null}
                    >
                      <Terminal />
                      Open terminal
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${sandbox.name ?? 'sandbox'}`}
                      title="Delete sandbox"
                      onClick={() => void removeSandbox(sandbox)}
                      disabled={working !== null}
                    >
                      {working === `delete:${sandbox.id}` ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </Button>
                  </div>

                  <form
                    className="grid gap-2 sm:grid-cols-[1fr_auto]"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void runCommand(sandbox)
                    }}
                  >
                    <Input
                      aria-label={`Command for ${sandbox.name ?? 'sandbox'}`}
                      value={commands[sandbox.id] ?? ''}
                      onChange={(event) =>
                        setCommands((current) => ({ ...current, [sandbox.id]: event.target.value }))
                      }
                      placeholder="Enter a command"
                      className="font-mono text-xs"
                    />
                    <Button type="submit" variant="outline" disabled={!commands[sandbox.id]?.trim() || working !== null}>
                      {working === `run:${sandbox.id}` ? <Loader2 className="animate-spin" /> : <Terminal />}
                      Run
                    </Button>
                  </form>

                  {outputs[sandbox.id] !== undefined ? (
                    <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                      {outputs[sandbox.id] || '(no output)'}
                    </pre>
                  ) : null}
                  {rowBusy ? <span className="sr-only" aria-live="polite">Working</span> : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}