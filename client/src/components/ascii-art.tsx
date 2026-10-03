import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
const FRAME_MS = 1000 / 40

type AsciiArtProps = {
  className?: string
}

/**
 * Animated ASCII plasma rendered to a character grid. Cell brightness is mapped
 * onto a glyph ramp, so the whole field drifts like a demoscene plasma.
 */
export function AsciiArt({ className }: AsciiArtProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let cell = 9
    let cols = 0
    let rows = 0
    let width = 0
    let height = 0
    let last = 0
    let raf = 0
    let running = true

    function resize() {
      const parent = canvas?.parentElement
      if (!canvas || !parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(rect.width, 1)
      height = Math.max(rect.height, 1)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

      cell = width < 480 ? 7 : 9
      cols = Math.ceil(width / cell)
      rows = Math.ceil(height / cell)
    }

    function draw(time: number) {
      if (!ctx) return
      const t = time / 1000

      ctx.clearRect(0, 0, width, height)
      ctx.font = `${cell * 0.82}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x / cols
          const py = y / rows

          const v =
            Math.sin(px * 7 + t * 0.55) +
            Math.sin(py * 9 - t * 0.42) +
            Math.sin((px + py) * 5 + t * 0.3) +
            Math.sin(Math.hypot(px - 0.5, py - 0.5) * 14 - t * 0.9)

          const norm = (v + 4) / 8
          const idx = Math.min(
            RAMP.length - 1,
            Math.max(0, Math.floor(norm * RAMP.length)),
          )

          // keep the plasma calm near the panel edges
          const edge =
            Math.min(1, Math.min(px, 1 - px) * 3.2) *
            Math.min(1, Math.min(py, 1 - py) * 3.2)

          ctx.fillStyle = `rgba(255,255,255,${(0.08 + norm * 0.4 * edge).toFixed(3)})`
          ctx.fillText(RAMP[idx]!, x * cell, y * cell)
        }
      }
    }

    function loop(time: number) {
      if (!running) return
      if (time - last >= FRAME_MS) {
        last = time
        draw(time)
      }
      raf = requestAnimationFrame(loop)
    }

    function start() {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    }

    function stop() {
      running = false
      cancelAnimationFrame(raf)
    }

    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    resize()

    if (reduced.matches) draw(1200)
    else raf = requestAnimationFrame(loop)

    function onVisibility() {
      if (reduced.matches) return
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas ref={canvasRef} aria-hidden className={cn('block size-full', className)} />
  )
}

const SCRIPT: readonly { cmd: string; out: string }[] = [
  { cmd: 'whoami', out: 'sandbox-operator' },
  { cmd: 'echo $SBX_IMAGE', out: 'alpine' },
  { cmd: 'sbx ps', out: 'sbx-ig-88-5d4eb0fe  running' },
  { cmd: 'sbx exec uname -a', out: 'Linux 6.12.0 x86_64 GNU/Linux' },
]

type TerminalProps = {
  className?: string
}

/** Typewriter terminal that loops through a short scripted session. */
export function AsciiTerminal({ className }: TerminalProps) {
  const codeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const code = codeRef.current
    if (!code) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const lines = SCRIPT.flatMap((s) => [`$ ${s.cmd}`, s.out])

    if (reduced.matches) {
      code.textContent = [...lines, '$ '].join('\n')
      return
    }

    let lineIdx = 0
    let cmdChars = 0
    let outChars = 0
    let stage = 0
    let timer = 0

    function paint() {
      const done = lines.slice(0, lineIdx * 2)
      const step = SCRIPT[lineIdx % SCRIPT.length]!
      const parts = [...done, `$ ${step.cmd}`.slice(0, cmdChars)]
      if (stage >= 2) parts.push(step.out.slice(0, outChars))
      if (code) code.textContent = parts.join('\n')
    }

    function tick() {
      const step = SCRIPT[lineIdx % SCRIPT.length]!
      const command = `$ ${step.cmd}`

      if (stage === 0) {
        cmdChars += 1
        if (cmdChars > command.length) {
          stage = 1
          timer = window.setTimeout(tick, 300)
          return
        }
        timer = window.setTimeout(tick, 55 + Math.random() * 45)
      } else if (stage === 1) {
        stage = 2
        outChars = 0
        timer = window.setTimeout(tick, 90)
      } else {
        outChars += 1
        if (outChars > step.out.length) {
          lineIdx += 1
          cmdChars = 0
          outChars = 0
          stage = 0
          timer = window.setTimeout(tick, 460)
          return
        }
        timer = window.setTimeout(tick, 28)
      }

      paint()
    }

    paint()
    timer = window.setTimeout(tick, 500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <pre
      className={cn(
        'overflow-hidden font-mono text-[11px] leading-relaxed whitespace-pre text-foreground/85 sm:text-xs',
        className,
      )}
    >
      <code
        ref={(el) => {
          codeRef.current = el
        }}
      />
      <span
        aria-hidden
        className="ml-px inline-block h-[0.95em] w-[0.5em] translate-y-[0.12em] bg-foreground/80 align-baseline motion-safe:animate-[blink_1.1s_steps(1,end)_infinite]"
      />
    </pre>
  )
}