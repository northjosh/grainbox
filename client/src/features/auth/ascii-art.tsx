import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const TAU = Math.PI * 2;

/** One full cycle: rise out of the bed, hold and spin, collapse back down. */
const CYCLE_MS = 14_000;
const RISE_END = 0.22;
const MELT_START = 0.64;
const MELT_END = 0.92;
/** Grains leave/land staggered inside their window, so edges slump unevenly. */
const RISE_STAGGER = 0.12;
const FALL_STAGGER = 0.1;

/** Yaw speed at full solidity; the spin fades out as the cube melts. */
const SPIN = 0.00035;
const TILT = -0.38;
const CUBE_SCALE = 0.26;

/** Paint depth for bed grains; anything solid sits in front of this. */
const BED_Z = 4;

type Vec3 = [number, number, number];

const CHAR_SET = [" ", ".", ":", "-", "=", "+", "*", "#", "@"];

interface Grain {
  /** Resting slot in the bed, in cells. Doubles as the landing spot. */
  bx: number;
  by: number;
  /** 0 bed-only, 1 cube edge, 2 cube face. */
  kind: 0 | 1 | 2;
  /** Slot on the cube surface, cube-local space. */
  ex: number;
  ey: number;
  ez: number;
  nx: number;
  ny: number;
  nz: number;
  /** Surface shading jitter, plus wave phase for the bed. */
  tone: number;
  drift: number;
  /** 0..1 stagger for leaving/returning, keyed to slot height. */
  riseOrder: number;
  fallOrder: number;
  sway: number;
  jx: number;
  jy: number;
  /** Slot position captured when released, so the fall ignores later spins. */
  fx: number;
  fy: number;
  fz: number;
  frozen: boolean;
}

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

function rotate(x: number, y: number, z: number, rx: number, ry: number): Vec3 {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  return [x1, y * cosX - z1 * sinX, y * sinX + z1 * cosX];
}

/** All points along the twelve cube edges; corners ride the t=0 endpoints. */
function buildEdgePoints(steps: number): Vec3[] {
  const corners: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push([i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5]);
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const d = i ^ j;
      if (d === 1 || d === 2 || d === 4) pairs.push([i, j]);
    }
  }

  const points: Vec3[] = [];
  for (const [i, j] of pairs) {
    const a = corners[i]!;
    const b = corners[j]!;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return points;
}

/** Lattice points across all six faces, so the cube renders solid. */
function buildFacePoints(steps: number): { p: Vec3; n: Vec3 }[] {
  const normals: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  const faces: { p: Vec3; n: Vec3 }[] = [];
  for (const n of normals) {
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const u = (i + 0.5) / steps - 0.5;
        const v = (j + 0.5) / steps - 0.5;
        const p: Vec3 =
          n[0] !== 0 ? [n[0] / 2, u, v] : n[1] !== 0 ? [u, n[1] / 2, v] : [u, v, n[2] / 2];
        faces.push({ p, n });
      }
    }
  }
  return faces;
}

/**
 * A rotating solid sand cube: it condenses upward out of a rippling bed,
 * spins while whole, then collapses grain by grain back into the bed.
 * The same grains make every trip, so the sand is never created or lost.
 */
export function SandBoxArt({ className }: { className?: string }) {
  const gridRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const pre = gridRef.current;
    if (!pre) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measureCtx = document.createElement("canvas").getContext("2d");

    let colCount = 0;
    let rowCount = 0;
    let cellW = 1;
    let cellH = 1;
    let grains: Grain[] = [];
    let valBuf: number[][] = [];
    let zBuf: number[][] = [];
    let raf = 0;
    let running = true;
    let laidOut = false;
    let last = 0;
    let ryAbs = -0.55;

    function build() {
      const parent = pre?.parentElement;
      if (!pre || !parent) return;

      const rect = parent.getBoundingClientRect();
      laidOut = rect.width > 0 && rect.height > 0;
      if (!laidOut) return;

      const fontSize = 10;
      cellH = 16;
      if (measureCtx) {
        const style = getComputedStyle(pre);
        measureCtx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
        cellW = Math.max(1, measureCtx.measureText("M").width);
      } else {
        cellW = 8;
      }
      colCount = Math.max(20, Math.floor(rect.width / cellW));
      rowCount = Math.max(12, Math.floor(rect.height / cellH));
      pre.style.fontSize = `${fontSize}px`;
      pre.style.lineHeight = `${cellH}px`;

      valBuf = Array.from({ length: rowCount }, () => new Array<number>(colCount).fill(0));
      zBuf = Array.from({ length: rowCount }, () => new Array<number>(colCount).fill(BED_Z + 1));

      const count = Math.round(Math.min(6500, Math.max(2800, (colCount * rowCount) / 2)));
      const shapeBudget = Math.floor(count * 0.7);
      const edgeGrains = Math.floor(shapeBudget * 0.55);
      const faceGrains = shapeBudget - edgeGrains;
      const edgeSteps = Math.max(24, Math.min(140, Math.floor(edgeGrains / 24)));
      const faceSteps = Math.max(9, Math.min(22, Math.floor(Math.sqrt(faceGrains / 6))));

      const edges = buildEdgePoints(edgeSteps);
      const faces = buildFacePoints(faceSteps);

      grains = [];
      let gi = 0;
      for (const point of edges) {
        for (let k = 0; k < 2 && gi < edgeGrains; k++, gi++) {
          grains.push(makeGrain(1, point[0], point[1], point[2], 0, 0, 0));
        }
      }
      for (const face of faces) {
        if (gi >= edgeGrains + faceGrains) break;
        grains.push(makeGrain(2, face.p[0], face.p[1], face.p[2], face.n[0], face.n[1], face.n[2]));
        gi += 1;
      }
      while (grains.length < count) grains.push(makeGrain(0, 0, 0, 0, 0, 0, 0));

      ryAbs = -0.55;
      last = 0;
    }

    function makeGrain(
      kind: 0 | 1 | 2,
      ex: number,
      ey: number,
      ez: number,
      nx: number,
      ny: number,
      nz: number,
    ): Grain {
      const grain: Grain = {
        bx: Math.random() * colCount,
        // Densest at the floor, thinning toward the horizon of the bed.
        by: rowCount - 1 - Math.pow(Math.random(), 1.7) * rowCount * 0.34,
        kind,
        ex,
        ey,
        ez,
        nx,
        ny,
        nz,
        tone: Math.random(),
        drift: Math.random() * TAU,
        riseOrder: 0,
        fallOrder: 0,
        sway: (Math.random() - 0.5) * 6,
        jx: (Math.random() - 0.5) * 1.2,
        jy: (Math.random() - 0.5) * 0.8,
        fx: 0,
        fy: 0,
        fz: 0,
        frozen: false,
      };
      // The cube gathers bottom-up and slumps top-down.
      grain.riseOrder = clamp01((grain.ey + 0.5) * 0.7 + Math.random() * 0.35);
      grain.fallOrder = clamp01((0.5 - grain.ey) * 0.7 + Math.random() * 0.35);
      return grain;
    }

    function projectPoint(x: number, y: number, z: number, rx: number, ry: number) {
      const [x1, y1, z2] = rotate(x, y, z, rx, ry);
      const scale = Math.min(colCount, rowCount) * CUBE_SCALE;
      const persp = 3.2 / (3.2 - z2);
      return {
        gx: colCount / 2 + x1 * scale * persp,
        gy: rowCount / 2 + y1 * scale * persp,
        z: z2,
      };
    }

    function paint(x: number, y: number, z: number, v: number) {
      if (x < 0 || x >= colCount || y < 0 || y >= rowCount || v <= 0) return;
      const current = zBuf[y]![x]!;
      if (z < current || (z < current + 0.06 && v > valBuf[y]![x]!)) {
        zBuf[y]![x] = z;
        valBuf[y]![x] = v;
      }
    }

    function shapeValue(g: Grain, z: number) {
      const depth = clamp01((z + 0.9) / 1.8);
      const base = g.kind === 1 ? 0.52 + 0.48 * depth : 0.26 + 0.5 * depth;
      const corner =
        g.kind === 1 && Math.abs(g.ex) + Math.abs(g.ey) + Math.abs(g.ez) > 1.4 ? 0.23 : 0;
      return clamp01(base + corner + (g.tone - 0.5) * 0.1);
    }

    function bedValue(g: Grain, time: number) {
      const ripple = 0.5 + 0.5 * Math.sin(time * 0.0005 - g.bx * 0.45 + g.drift);
      return 0.08 + 0.12 * g.tone + 0.05 * ripple;
    }

    function draw(phase: number, ry: number, time: number) {
      if (!pre || !laidOut) return;

      const rx = TILT + Math.sin(ry * 0.8) * 0.08;
      for (let y = 0; y < rowCount; y++) {
        valBuf[y]!.fill(0);
        zBuf[y]!.fill(BED_Z + 1);
      }

      for (const g of grains) {
        const breeze = Math.sin(time / 3000 + g.drift);
        const bedX = g.bx + breeze * 1.2 + g.jx;
        const bedY = g.by + breeze * 0.6 + g.jy;
        const bedV = bedValue(g, time);

        if (g.kind === 0) {
          paint(Math.round(bedX), Math.round(bedY), BED_Z, bedV);
          continue;
        }

        const melting = phase >= MELT_START;
        if (!melting) g.frozen = false;

        const rp = melting ? 1 : clamp01((phase - g.riseOrder * RISE_STAGGER) / RISE_END);
        const dp = melting
          ? clamp01((phase - MELT_START - g.fallOrder * FALL_STAGGER) / (MELT_END - MELT_START))
          : 0;

        if (dp > 0) {
          if (!g.frozen) {
            const proj = projectPoint(g.ex, g.ey, g.ez, rx, ry);
            g.fx = proj.gx;
            g.fy = proj.gy;
            g.fz = proj.z;
            g.frozen = true;
          }
          // Gravity: accelerate downward, drift back to the bed slot, dim out.
          const t = Math.pow(dp, 1.6);
          const gx =
            lerp(g.fx, bedX, Math.min(1, t * 1.25)) +
            Math.sin(t * Math.PI) * g.sway * (1 - t) * 0.5;
          const gy = lerp(g.fy, bedY, t);
          paint(
            Math.round(gx),
            Math.round(gy),
            lerp(g.fz, BED_Z, t),
            lerp(shapeValue(g, g.fz), bedV, t),
          );
          continue;
        }

        if (rp < 1) {
          // Rising: chase the slowly spinning slot up out of the bed.
          const proj = projectPoint(g.ex, g.ey, g.ez, rx, ry);
          const t = 1 - Math.pow(1 - rp, 3);
          const gx = lerp(bedX, proj.gx, t) + Math.sin(t * Math.PI) * g.sway * (1 - t);
          paint(
            Math.round(gx),
            Math.round(lerp(bedY, proj.gy, t)),
            lerp(BED_Z, proj.z, t),
            lerp(bedV, shapeValue(g, proj.z), t),
          );
          continue;
        }

        // Holding: paint the solid slot, with backface-culled faces.
        if (g.kind === 2) {
          const n = rotate(g.nx, g.ny, g.nz, rx, ry);
          if (n[2] <= 0.06) continue;
        }
        const proj = projectPoint(g.ex, g.ey, g.ez, rx, ry);
        paint(Math.round(proj.gx), Math.round(proj.gy), proj.z, shapeValue(g, proj.z));
      }

      let out = "";
      for (let r = 0; r < rowCount; r++) {
        const row = valBuf[r]!;
        let line = "";
        for (let c = 0; c < colCount; c++) {
          line += chooseChar(row[c]!);
        }
        out += line;
        if (r < rowCount - 1) out += "\n";
      }
      pre.textContent = out;
    }

    function loop(time: number) {
      if (!running || !laidOut) return;
      if (!last) last = time - 16;
      const dt = Math.min(48, time - last);
      last = time;

      const phase = (time % CYCLE_MS) / CYCLE_MS;
      const envelope = Math.min(
        smoothstep(0, RISE_END, phase),
        1 - smoothstep(MELT_START, MELT_END, phase),
      );
      // The cube only spins while it holds together.
      ryAbs += SPIN * dt * (0.15 + 0.85 * envelope * envelope);

      draw(phase, ryAbs, time);
      raf = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      build();
      // The static reduced-motion frame never repaints itself after a rebuild.
      if (reduced.matches) draw(RISE_END + 0.05, ryAbs, 900);
    });
    if (pre.parentElement) observer.observe(pre.parentElement);
    build();

    if (reduced.matches) {
      draw(RISE_END + 0.05, ryAbs, 900);
    } else {
      raf = requestAnimationFrame(loop);
    }

    function triggerRedraw() {
      if (reduced.matches && laidOut) draw(RISE_END + 0.05, ryAbs, 900);
    }
    reduced.addEventListener("change", triggerRedraw);

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
      reduced.removeEventListener("change", triggerRedraw);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <pre
      ref={gridRef}
      aria-hidden
      className={cn(
        // Baked to the dark panel so it stays readable in light mode too.
        "m-0 overflow-hidden whitespace-pre font-mono text-zinc-100/90 selection:bg-transparent",
        className,
      )}
    />
  );
}
