import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

const TAU = Math.PI * 2

/** One full breathe: condense out of the bed, hold, melt back into it. */
const CYCLE_MS = 12_000
const FORM_END = 0.24
const MELT_START = 0.62
const MELT_END = 0.9
/** Per-grain delay, so the shape gathers unevenly instead of snapping. */
const SPREAD = 0.4

const ROT_X = 0.00019
const ROT_Y = 0.00027

/** Samples per cube edge. This sets how finely the wireframe resolves. */
const EDGE_STEPS = 130
/** Grains stacked on each sample, giving the ridge some thickness. */
const GRAINS_PER_SAMPLE = 2

type Vec3 = [number, number, number]

interface Grain {
  /** Resting place in the sand bed, as a fraction of the panel. */
  sx: number
  sy: number
  /** The slot on the cube's edges this grain aims for, in cube-local space. */
  ex: number
  ey: number
  ez: number
  /** 0..1 threshold deciding when this grain leaves the bed. */
  join: number
  tone: number
  drift: number
  /** Fixed sub-pixel offset, so stacked grains don't land on one pixel. */
  jx: number
  jy: number
  /** False for the ambient bed grains that never join the shape. */
  shape: boolean
}

type AsciiArtProps = {
  className?: string
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * The eight corners of a unit cube, then every point along the twelve edges.
 * Walking the edges this way keeps the corners dense, where the eye expects
 * them, without duplicating a corner twice.
 */
function buildEdgePoints(): Vec3[] {
  const c: Vec3[] = []
  for (let i = 0; i < 8; i++) {
    c.push([i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5])
  }

  // Two corners are joined by an edge when they differ in exactly one bit.
  const pairs: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const d = i ^ j
      if (d === 1 || d === 2 || d === 4) pairs.push([i, j])
    }
  }

  const points: Vec3[] = []
  for (const [i, j] of pairs) {
    const a = c[i]!
    const b = c[j]!
    for (let s = 0; s < EDGE_STEPS; s++) {
      const t = s / EDGE_STEPS
      points.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ])
    }
  }

  return points
}

const EDGE_POINTS = buildEdgePoints()

/**
 * A rotating wireframe cube made of sand. The cube condenses out of a bed of
 * loose grains, holds, then melts back down, so it is always ephemeral rather
 * than drawn.
 */
export function SandBoxArt({ className }: AsciiArtProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let width = 0
    let height = 0
    let dpr = 1
    let grains: Grain[] = []
    let raf = 0
    let running = true
    /** False while the panel is display:none, so we skip the work entirely. */
    let laidOut = false

    function build() {
      const parent = canvas?.parentElement
      if (!canvas || !parent) return

      const rect = parent.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(rect.width, 1)
      height = Math.max(rect.height, 1)
      // The panel is hidden below the lg breakpoint; don't render into nothing.
      laidOut = rect.width > 0 && rect.height > 0
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Sparse enough to read as scattered sand, dense enough to fill the panel.
      const count = Math.round(
        Math.min(9000, Math.max(1400, (width * height) / 70)),
      )

      grains = Array.from({ length: count }, () => ({
        // The bed covers the whole panel; the cube grows out of it. Shape
        // grains rest here too, so a melted cube blends back into the sand.
        sx: Math.random(),
        sy: Math.random(),
        ex: 0,
        ey: 0,
        ez: 0,
        join: Math.random(),
        tone: Math.random(),
        drift: Math.random() * TAU,
        jx: (Math.random() - 0.5) * 2.6,
        jy: (Math.random() - 0.5) * 2.6,
        shape: false,
      }))

      // Roughly 40% of the bed is recruited to build the cube.
      const shapeCount = Math.min(
        count,
        EDGE_POINTS.length * GRAINS_PER_SAMPLE,
      )
      for (let i = 0; i < shapeCount; i++) {
        const g = grains[i]!
        const edge = EDGE_POINTS[i % EDGE_POINTS.length]!
        g.shape = true
        g.ex = edge[0]
        g.ey = edge[1]
        g.ez = edge[2]
      }

      // Assigning canvas.width clears it, so repaint the still frame whenever
      // the canvas is rebuilt while motion is reduced.
      if (reduced.matches) draw(1, 900)
    }

    /** Rotates around Y then X and projects with a weak perspective divide. */
    function project(x: number, y: number, z: number, rx: number, ry: number) {
      const cosY = Math.cos(ry)
      const sinY = Math.sin(ry)
      const x1 = x * cosY - z * sinY
      const z1 = x * sinY + z * cosY

      const cosX = Math.cos(rx)
      const sinX = Math.sin(rx)
      const y1 = y * cosX - z1 * sinX
      const z2 = y * sinX + z1 * cosX

      const scale = Math.min(width, height) * 0.42
      const persp = 3.2 / (3.2 - z2)

      return {
        x: width / 2 + x1 * scale * persp,
        y: height / 2 + y1 * scale * persp,
        z: z2,
      }
    }

    function draw(formation: number, time: number) {
      if (!ctx || !canvas || !laidOut) return
      const dw = canvas.width
      const dh = canvas.height
      const img = ctx.createImageData(dw, dh)
      const data = img.data

      const rx = Math.sin(time * ROT_X) * 0.9 - 0.35
      const ry = time * ROT_Y

      for (const grain of grains) {
        // Every grain drifts in the bed, so the sand is never static.
        const breeze = Math.sin(time / 2600 + grain.drift)
        const bedX = grain.sx * width + breeze * 9 + grain.jx
        const bedY = grain.sy * height + breeze * 4.5 + grain.jy

        let px: number
        let py: number
        let depth: number

        if (grain.shape) {
          // Stagger: a grain only travels once the front passes its threshold.
          const gp = clamp01((formation - grain.join * SPREAD) / (1 - SPREAD))
          // Sags under gravity while unformed, so it slumps rather than snaps.
          const sag = (1 - gp) * 0.5
          const target = project(grain.ex, grain.ey + sag, grain.ez, rx, ry)
          // Travel happens in screen space, so a grain leaves the bed exactly
          // where it was lying and lands exactly on its slot.
          px = lerp(bedX, target.x, gp) + grain.jx * (1 - gp)
          py = lerp(bedY, target.y, gp) + grain.jy * (1 - gp)
          depth = clamp01((target.z + 0.9) / 1.8)
        } else {
          px = bedX
          py = bedY
          depth = grain.tone
        }

        const ix = Math.round(px * dpr)
        const iy = Math.round(py * dpr)
        if (ix < 0 || iy < 0 || ix >= dw || iy >= dh) continue

        // Depth shading: back edges sit in shadow, front edges catch light.
        const lit = grain.shape ? 0.55 + depth * 0.45 : 0.18 + depth * 0.22
        const i = (iy * dw + ix) * 4
        data[i] = Math.round(206 + lit * 44)
        data[i + 1] = Math.round(158 + lit * 78)
        data[i + 2] = Math.round(92 + lit * 108)
        data[i + 3] = Math.round(
          (grain.shape ? 96 + depth * 150 : 26 + depth * 54) *
            (0.55 + grain.tone * 0.45),
        )
      }

      ctx.putImageData(img, 0, 0)
    }

    function loop(time: number) {
      if (!running) return

      const phase = (time % CYCLE_MS) / CYCLE_MS
      const formation = Math.min(
        smoothstep(0, FORM_END, phase),
        1 - smoothstep(MELT_START, MELT_END, phase),
      )

      draw(formation, time)
      raf = requestAnimationFrame(loop)
    }

    const observer = new ResizeObserver(build)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    build()

    if (reduced.matches) {
      draw(1, 900)
    } else {
      raf = requestAnimationFrame(loop)
    }

    function onVisibility() {
      if (reduced.matches) return
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('block size-full', className)}
    />
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