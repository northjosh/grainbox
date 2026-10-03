import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Clock,
  Copy,
  Loader2,
  LogOut,
  Moon,
  Play,
  RotateCcw,
  Server,
  Square,
  Sun,
  Terminal,
  Timer,
  XCircle,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  IMAGES,
  MAX_CONCURRENT,
  SERVER_TIMEOUT_MS,
  checkHealth,
  runCommand,
  type Image,
  type RunOutcome,
  type RunResult,
} from '@/lib/api'
import {
  clearIdentity,
  isAuthenticated,
  logout,
  readIdentity,
  type Identity,
} from '@/lib/auth'

export const Route = createFileRoute('/')({ component: Home })

const SNIPPETS: Record<Image, readonly string[]> = {
  python: [
    `python -c "print('hello from a microVM!')"`,
    'python -V && pip list',
    'uname -a && free -m',
  ],
  debian: ['uname -a && cat /etc/os-release', 'free -m', 'ls -la /'],
  alpine: ['cat /etc/os-release', 'apk info | head -20', 'uname -a && df -h'],
}

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const OUTCOME_META: Record<
  RunOutcome,
  { label: string; icon: typeof CheckCircle2; badge: BadgeVariant }
> = {
  success: { label: 'success', icon: CheckCircle2, badge: 'success' },
  'bad-image': { label: 'rejected', icon: CircleSlash, badge: 'secondary' },
  busy: { label: 'at capacity', icon: AlertTriangle, badge: 'warning' },
  timeout: { label: 'timed out', icon: Clock, badge: 'warning' },
  error: { label: 'failed', icon: XCircle, badge: 'destructive' },
}

const FAILURE_TITLES: Record<Exclude<RunOutcome, 'success'>, string> = {
  'bad-image': 'Image not allowed',
  busy: 'Server at capacity',
  timeout: 'Command timed out',
  error: 'Server error',
}

interface RunEntry {
  id: number
  image: Image
  command: string
  result: RunResult
}

type Theme = 'dark' | 'light'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('theme') === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return [theme, setTheme] as const
}

function Home() {
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const [image, setImage] = useState<Image>('alpine')
  const [command, setCommand] = useState<string>(SNIPPETS.alpine[0])
  const [pending, setPending] = useState<RunResult | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [history, setHistory] = useState<RunEntry[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [inflight, setInflight] = useState(0)
  const [identity, setIdentity] = useState<Identity | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const nextId = useRef(1)

  useEffect(() => {
    const controller = new AbortController()
    void checkHealth(controller.signal).then(setHealthy)
    void isAuthenticated(controller.signal).then((authed) => {
      if (!authed) void navigate({ to: '/login' })
    })
    setIdentity(readIdentity())
    return () => controller.abort()
  }, [navigate])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const submit = useCallback(async () => {
    const trimmed = command.trim()
    if (!trimmed || inflight >= MAX_CONCURRENT) return

    const controller = new AbortController()
    abortRef.current = controller

    setNetworkError(null)
    setPending(null)
    setResult(null)
    setCopied(false)
    setInflight((n) => n + 1)

    try {
      const next = await runCommand(image, trimmed, controller.signal)
      if (next.httpStatus === 401) {
        clearIdentity()
        void navigate({ to: '/login' })
        return
      }
      setResult(next)
      setHistory((prev) => [
        { id: nextId.current++, image, command: trimmed, result: next },
        ...prev,
      ])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setNetworkError(e instanceof Error ? e.message : String(e))
      setHealthy(false)
    } finally {
      abortRef.current = null
      setInflight((n) => n - 1)
    }
  }, [command, image, inflight, navigate])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void submit()
      }
      if (e.key === 'Escape' && abortRef.current) {
        abortRef.current.abort()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [submit])

  const busy = inflight > 0
  const current = result ?? pending
  const meta = current ? OUTCOME_META[current.outcome] : null
  const StatusIcon = meta?.icon
  const atCapacity = inflight >= MAX_CONCURRENT

  async function copyOutput() {
    if (!current?.stdout) return
    try {
      await navigator.clipboard.writeText(current.stdout)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function onLogout() {
    await logout()
    setIdentity(null)
    void navigate({ to: '/login' })
  }

  return (
    <TooltipProvider delay={200}>
      <div className="flex min-h-screen flex-col bg-background">
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

            <Badge
              variant={
                healthy === null ? 'secondary' : healthy ? 'success' : 'destructive'
              }
              className="gap-1.5"
            >
              {healthy === null ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Server />
              )}
              {healthy === null ? 'checking' : healthy ? 'online' : 'offline'}
            </Badge>

            <Badge variant="outline" className="font-mono">
              {inflight}/{MAX_CONCURRENT} slots
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />
                }
              >
                {theme === 'dark' ? <Moon /> : <Sun />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun />
                  Light
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {identity ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 font-normal"
                      aria-label="Account"
                    />
                  }
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                    {identity.name.slice(0, 2)}
                  </span>
                  <span className="hidden max-w-32 truncate sm:inline">
                    {identity.email}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <span className="block truncate text-sm">{identity.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {identity.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => void onLogout()}>
                      <LogOut />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-6 lg:grid-cols-[22rem_1fr]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="size-4" />
                  New run
                </CardTitle>
                <CardDescription>
                  Each run boots a fresh microVM. Max {MAX_CONCURRENT} concurrent,{' '}
                  {SERVER_TIMEOUT_MS / 1000}s timeout.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="image">Image</Label>
                  <Select
                    value={image}
                    onValueChange={(value) => {
                      const next = value as Image
                      setImage(next)
                      setCommand(SNIPPETS[next][0])
                    }}
                  >
                    <SelectTrigger id="image" className="w-full font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGES.map((name) => (
                        <SelectItem key={name} value={name} className="font-mono">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="command">Command</Label>
                  <Textarea
                    id="command"
                    value={command}
                    spellCheck={false}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        void submit()
                      }
                    }}
                    className="min-h-24 resize-y font-mono text-sm"
                    placeholder="uname -a"
                  />
                  <p className="text-xs text-muted-foreground">
                    <kbd className="font-mono">⌘</kbd> +{' '}
                    <kbd className="font-mono">↵</kbd> to run,{' '}
                    <kbd className="font-mono">esc</kbd> to cancel
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SNIPPETS[image].map((snippet) => (
                    <Button
                      key={snippet}
                      variant="outline"
                      size="sm"
                      onClick={() => setCommand(snippet)}
                      className="h-auto max-w-full justify-start py-1 font-mono text-xs whitespace-normal"
                    >
                      {snippet}
                    </Button>
                  ))}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy || !command.trim() || atCapacity}
                    onClick={() => void submit()}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <Play />}
                    {busy ? 'Running' : 'Run'}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={!busy}
                          onClick={() => abortRef.current?.abort()}
                          aria-label="Cancel run"
                        />
                      }
                    >
                      <Square />
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-0 gap-0 py-0">
            <Tabs defaultValue="output" className="min-h-0 gap-0">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <TabsList>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="history">
                    History
                    {history.length > 0 ? ` (${history.length})` : ''}
                  </TabsTrigger>
                </TabsList>

                <div className="ml-auto flex items-center gap-2">
                  {current ? (
                    <>
                      <Badge variant={meta?.badge} className="gap-1">
                        {StatusIcon ? <StatusIcon /> : null}
                        {meta?.label}
                      </Badge>
                      <Badge variant="outline" className="gap-1 font-mono">
                        <Timer />
                        {(current.durationMs / 1000).toFixed(2)}s
                      </Badge>
                    </>
                  ) : null}

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!current?.stdout}
                          onClick={() => void copyOutput()}
                          aria-label="Copy output"
                        />
                      }
                    >
                      {copied ? <CheckCircle2 /> : <Copy />}
                    </TooltipTrigger>
                    <TooltipContent>{copied ? 'Copied' : 'Copy'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!result && !pending}
                          onClick={() => {
                            setResult(null)
                            setPending(null)
                            setNetworkError(null)
                          }}
                          aria-label="Clear output"
                        />
                      }
                    >
                      <RotateCcw />
                    </TooltipTrigger>
                    <TooltipContent>Clear</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <TabsContent value="output" className="min-h-0">
                <div className="px-4 py-3">
                  {networkError ? (
                    <Alert variant="destructive">
                      <XCircle />
                      <AlertTitle>Request failed</AlertTitle>
                      <AlertDescription>{networkError}</AlertDescription>
                    </Alert>
                  ) : pending ? (
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Booting microVM
                        <span className="font-mono text-muted-foreground">
                          {image}
                        </span>
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : result ? (
                    <div className="grid gap-3">
                      {result.outcome !== 'success' ? (
                        <Alert
                          variant={result.outcome === 'error' ? 'destructive' : 'warning'}
                        >
                          {result.outcome === 'timeout' ? (
                            <Clock />
                          ) : result.outcome === 'busy' ? (
                            <AlertTriangle />
                          ) : (
                            <CircleSlash />
                          )}
                          <AlertTitle>{FAILURE_TITLES[result.outcome]}</AlertTitle>
                          <AlertDescription>
                            HTTP {result.httpStatus} · {result.stdout}
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      {result.stdout ? (
                        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-sm whitespace-pre-wrap break-words">
                          {result.stdout}
                        </pre>
                      ) : result.outcome === 'success' ? (
                        <p className="text-sm text-muted-foreground">
                          Command produced no output.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid place-items-center gap-1 py-10 text-center">
                      <Terminal className="size-6 text-muted-foreground" />
                      <p className="text-sm font-medium">No output yet</p>
                      <p className="text-sm text-muted-foreground">
                        Pick an image and hit Run.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="min-h-0">
                {history.length === 0 ? (
                  <div className="grid place-items-center gap-1 py-10 text-center">
                    <Clock className="size-6 text-muted-foreground" />
                    <p className="text-sm font-medium">No runs yet</p>
                    <p className="text-sm text-muted-foreground">
                      Finished runs show up here.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[28rem]">
                    <ul className="divide-y">
                      {history.map((entry) => {
                        const entryMeta = OUTCOME_META[entry.result.outcome]
                        const EntryIcon = entryMeta.icon
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setImage(entry.image)
                                setCommand(entry.command)
                                setResult(entry.result)
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                            >
                              <EntryIcon className="size-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-sm">
                                  {entry.command}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.image} ·{' '}
                                  {(entry.result.durationMs / 1000).toFixed(2)}s ·{' '}
                                  {entryMeta.label}
                                </p>
                              </div>
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  )
}