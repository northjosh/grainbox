import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const TAU = Math.PI * 2;

/** One full breathe: condense out of the bed, hold, melt back into it. */
const CYCLE_MS = 12_000;
const FORM_END = 0.24;
const MELT_START = 0.62;
const MELT_END = 0.9;
/** Per-grain delay, so the shape gathers unevenly instead of snapping. */
const SPREAD = 0.4;

const ROT_X = 0.00019;
const ROT_Y = 0.00027;

/** Samples per cube edge. This sets how finely the wireframe resolves. */
const EDGE_STEPS = 130;
/** Grains stacked on each sample, giving the ridge some thickness. */
const GRAINS_PER_SAMPLE = 2;

const CHAR_SET = [" ", ".", ":", "-", "=", "+", "*", "#", "@"];

type Vec3 = [number, number, number];

interface Grain {
  /** Resting place in the sand bed, as a fraction of the panel. */
  sx: number;
  sy: number;
  /** The slot on the cube's edges this grain aims for, in cube-local space. */
  ex: number;
  ey: number;
  ez: number;
  /** 0..1 threshold deciding when this grain leaves the bed. */
  join: number;
  tone: number;
  drift: number;
  /** Fixed sub-pixel offset, so stacked grains don't land on one cell. */
  jx: number;
  jy: number;
  /** False for the ambient bed grains that never join the shape. */
  shape: boolean;
}

type AsciiArtProps = {
  className?: string;
};

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function chooseChar(v: number) {
  if (v <= 0) return " ";
  const idx = Math.min(CHAR_SET.length - 1, Math.floor(v * CHAR_SET.length));
  return CHAR_SET[idx];
}

/**
 * The eight corners of a unit cube, then every point along the twelve edges.
 * Walking the edges this way keeps the corners dense, where the eye expects
 * them, without duplicating a corner twice.
 */
function buildEdgePoints(): Vec3[] {
  const c: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    c.push([i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5]);
  }

  // Two corners are joined by an edge when they differ in exactly one bit.
  const pairs: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const d = i ^ j;
      if (d === 1 || d === 2 || d === 4) pairs.push([i, j]);
    }
  }

  const points: Vec3[] = [];
  for (const [i, j] of pairs) {
    const a = c[i]!;
    const b = c[j]!;
    for (let s = 0; s < EDGE_STEPS; s++) {
      const t = s / EDGE_STEPS;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }

  return points;
}

const EDGE_POINTS = buildEdgePoints();

/**
 * A rotating ASCII sand cube. The cube condenses out of a bed of
 * loose grains, holds, then melts back down, so it is always ephemeral.
 */
export function SandBoxArt({ className }: AsciiArtProps) {
  const gridRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const pre = gridRef.current;
    if (!pre) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let colCount = 0;
    let rowCount = 0;
    let cellW = 1;
    let cellH = 1;
    let grains: Grain[] = [];
    let raf = 0;
    let running = true;
    let laidOut = false;

    function build() {
      const parent = pre?.parentElement;
      if (!pre || !parent) return;

      const rect = parent.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      laidOut = rect.width > 0 && rect.height > 0;
      if (!laidOut) return;

      const fontSize = 10;
      cellW = 8;
      cellH = 16;
      colCount = Math.max(20, Math.floor(width / cellW));
      rowCount = Math.max(12, Math.floor(height / cellH));
      pre.style.fontSize = `${fontSize}px`;
      pre.style.lineHeight = `${cellH}px`;

      // Sparse enough to read as scattered sand, dense enough to fill the grid.
      const count = Math.round(Math.min(6000, Math.max(800, (colCount * rowCount) / 2)));

      grains = Array.from({ length: count }, () => ({
        sx: Math.random(),
        sy: Math.random(),
        ex: 0,
        ey: 0,
        ez: 0,
        join: Math.random(),
        tone: Math.random(),
        drift: Math.random() * TAU,
        jx: (Math.random() - 0.5) * 1.2,
        jy: (Math.random() - 0.5) * 1.2,
        shape: false,
      }));

      const shapeCount = Math.min(count, EDGE_POINTS.length * GRAINS_PER_SAMPLE);
      for (let i = 0; i < shapeCount; i++) {
        const g = grains[i]!;
        const edge = EDGE_POINTS[i % EDGE_POINTS.length]!;
        g.shape = true;
        g.ex = edge[0];
        g.ey = edge[1];
        g.ez = edge[2];
      }
    }

    function project(x: number, y: number, z: number, rx: number, ry: number) {
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const scale = Math.min(colCount, rowCount) * 0.24;
      const persp = 3.2 / (3.2 - z2);

      return {
        gx: colCount / 2 + x1 * scale * persp,
        gy: rowCount / 2 + y1 * scale * persp,
        z: z2,
      };
    }

    function draw(formation: number, time: number) {
      if (!pre || !laidOut) return;

      const rx = Math.sin(time * ROT_X) * 0.9 - 0.35;
      const ry = time * ROT_Y;

      const grid: number[][] = Array.from({ length: rowCount }, () => new Array(colCount).fill(0));

      for (const grain of grains) {
        const breeze = Math.sin(time / 2600 + grain.drift);
        const bedX = grain.sx * colCount + breeze * 6 + grain.jx;
        const bedY = grain.sy * rowCount + breeze * 3 + grain.jy;

        let gx: number;
        let gy: number;
        let depth: number;

        if (grain.shape) {
          const gp = clamp01((formation - grain.join * SPREAD) / (1 - SPREAD));
          const sag = (1 - gp) * 0.4;
          const target = project(grain.ex, grain.ey + sag, grain.ez, rx, ry);
          gx = lerp(bedX, target.gx, gp) + grain.jx * (1 - gp);
          gy = lerp(bedY, target.gy, gp) + grain.jy * (1 - gp);
          depth = clamp01((target.z + 0.9) / 1.8);
        } else {
          gx = bedX;
          gy = bedY;
          depth = grain.tone;
        }

        const x = Math.round(gx);
        const y = Math.round(gy);
        if (x < 0 || x >= colCount || y < 0 || y >= rowCount) continue;

        const val = grain.shape ? 0.2 + depth * 0.8 : 0.08 + depth * 0.14;
        const fade = 0.55 + grain.tone * 0.45;
        grid[y][x] = Math.max(grid[y][x], val * fade);
      }

      let out = "";
      for (let r = 0; r < rowCount; r++) {
        let line = "";
        for (let c = 0; c < colCount; c++) {
          line += chooseChar(grid[r][c]);
        }
        out += line;
        if (r < rowCount - 1) out += "\n";
      }
      pre.textContent = out;
    }

    function loop(time: number) {
      if (!running || !laidOut) return;

      const phase = (time % CYCLE_MS) / CYCLE_MS;
      const formation = Math.min(
        smoothstep(0, FORM_END, phase),
        1 - smoothstep(MELT_START, MELT_END, phase),
      );

      draw(formation, time);
      raf = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(build);
    if (pre.parentElement) observer.observe(pre.parentElement);
    build();

    if (reduced.matches) {
      draw(1, 900);
    } else {
      raf = requestAnimationFrame(loop);
    }

    function onVisibility() {
      if (reduced.matches) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <pre
      ref={gridRef}
      aria-hidden
      className={cn(
        "m-0 overflow-hidden whitespace-pre font-mono text-foreground/90 selection:bg-transparent",
        className,
      )}
    />
  );
}
