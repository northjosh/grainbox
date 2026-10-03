import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2, Terminal } from 'lucide-react'

import { SandBoxArt } from '@/components/ascii-art'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, signup, writeIdentity } from '@/lib/auth'

export const Route = createFileRoute('/login')({ component: LoginPage })

type Mode = 'signin' | 'signup'

const MODES: { value: Mode; label: string }[] = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Create account' },
]

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isSignup = mode === 'signup'
  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (!isSignup || name.trim().length > 0) &&
    !pending

  // someone arriving with a live session has no business on this page
  useEffect(() => {
    fetch('/api/session')
      .then((res) => {
        if (res.ok) void navigate({ to: '/' })
      })
      .catch(() => {})
  }, [navigate])

  useEffect(() => {
    setError(null)
  }, [mode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setPending(true)
    setError(null)

    try {
      if (isSignup) {
        await signup(name.trim(), email.trim(), password)
        writeIdentity({ name: name.trim(), email: email.trim() })
      } else {
        await login(email.trim(), password)
        writeIdentity({ name: email.trim().split('@')[0] ?? email.trim(), email: email.trim() })
      }
      await navigate({ to: '/' })
    } catch {
      // srv throws on bad credentials and duplicate signups, so both surface
      // as a non-2xx. There is nothing more specific to show.
      setError(
        isSignup
          ? 'Could not create that account. The email may already be registered.'
          : 'Invalid email or password.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r bg-zinc-950 lg:block">
        <div className="absolute inset-0">
          <SandBoxArt />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-white text-zinc-950">
              <Terminal className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-white">sandbox</span>
          </div>

          <div className="max-w-md space-y-6">
            <div className="space-y-1">
              <h2 className="font-mono text-2xl leading-snug font-medium text-white">
                fire up a microVM
                <br />
                in about 300ms
              </h2>
              <p className="text-sm text-white/60">
                Isolated Alpine, Debian and Python images. Throw away the command,
                keep the result.
              </p>
            </div>


          </div>

          <p className="font-mono text-xs text-white/40">
            3 concurrent slots · 30s timeout · ephemeral
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup
                ? 'Pick a name and start running commands.'
                : 'Sign in to spin up sandboxes.'}
            </p>
          </div>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as Mode)}
            className="gap-4"
          >
            <TabsList className="w-full">
              {MODES.map((m) => (
                <TabsTrigger key={m.value} value={m.value}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="josh"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending
                ? 'Please wait'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
              {!pending ? <ArrowRight /> : null}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}