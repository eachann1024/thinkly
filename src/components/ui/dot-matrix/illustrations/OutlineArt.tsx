import { cn } from "@/lib/utils";
import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { clamp, type Dot, halo, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";

const W = 196;
const H = 156;
const P = 4;
const RINGS = 6;
const SCAN_PERIOD = 12;

type Row = { y: number; level: 1 | 2 | 3; len: number; current?: boolean };
const ROWS: Row[] = [
  { y: 22, level: 1, len: 128 },
  { y: 46, level: 2, len: 96 },
  { y: 64, level: 3, len: 76 },
  { y: 84, level: 3, len: 88, current: true },
  { y: 108, level: 2, len: 104 },
  { y: 126, level: 3, len: 60 },
];
const INDENT = { 1: 18, 2: 40, 3: 62 } as const;
const STYLE = {
  1: { r: 1.45, o: 0.82 },
  2: { r: 1.1, o: 0.6 },
  3: { r: 0.95, o: 0.44 },
} as const;
const GUIDES = [
  { x: 28, y0: 34, y1: 132 },
  { x: 50, y0: 56, y1: 92 },
  { x: 50, y0: 118, y1: 132 },
];

function rowDots({ y, level, len, current }: Row) {
  const x0 = INDENT[level];
  const { r, o } = STYLE[level];
  const dots: Dot[] = [];
  if (level === 1) for (const [dx, dy] of [[0, -2], [P, -2], [0, 2], [P, 2]]) dots.push({ x: x0 + dx, y: y + dy, r: r * 1.05, o: o + 0.1 });
  else dots.push({ x: x0, y, r: r * 1.25, o: Math.min(1, o + 0.2), accent: current });
  const start = x0 + (level === 1 ? 14 : 10);
  for (let x = start; x <= start + len; x += P) {
    const tail = clamp((start + len - x) / 24);
    const base = { x, y, r: r * (0.8 + tail * 0.2), o: (current ? 0.92 : o) * (0.45 + tail * 0.55), accent: current };
    dots.push(base);
    if (level === 1) dots.push({ ...base, y: y + 4, o: base.o * 0.7 }, { ...base, y: y - 4, o: base.o * 0.7 });
  }
  return dots;
}

function build() {
  const rows = ROWS.map((row) => ({ row, dots: rowDots(row) }));
  const current = ROWS.find((r) => r.current)!;
  const x0 = INDENT[current.level] - 10, x1 = x0 + current.len + 32;
  const band: Dot[] = [];
  for (let y = current.y - 8; y <= current.y + 8; y += P) {
    if (y === current.y) continue;
    for (let x = x0; x <= x1; x += P) {
      const edge = clamp(Math.min(x - x0, x1 - x) / 20);
      band.push({ x, y, r: 0.7, o: 0.08 + edge * 0.14, accent: true });
    }
  }
  const bar: Dot[] = [-4, 0, 4].map((dy) => ({ x: x0 - 6, y: current.y + dy, r: 1.2, o: 0.95, accent: true }));
  const guides: Dot[] = GUIDES.flatMap(({ x, y0, y1 }) => {
    const out: Dot[] = [];
    for (let y = y0; y <= y1; y += P) out.push({ x, y, r: 0.65, o: 0.22 });
    return out;
  });
  const haloDots = halo(W, H, W / 2, H / 2, 112, {
    skip: (x, y) => ROWS.some((r) => Math.abs(y - r.y) < 10 && x > INDENT[r.level] - 8 && x < INDENT[r.level] + r.len + 22),
    pitch: 7,
    max: 0.13,
    density: 0.85,
  });
  return {
    halo: ringBuckets(haloDots, { cx: W / 2, cy: H / 2, n: RINGS }),
    rows: rows.filter((r) => !r.row.current).map((r) => r.dots),
    current: rows.find((r) => r.row.current)!.dots,
    currentIndex: ROWS.indexOf(current),
    band,
    bar,
    guides,
  };
}

const ART = build();
const RIPPLE = DOT_MOTION.period.ripple;

export function OutlineArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={W} height={H} origin={[18, 50]} className={cn("shrink-0 text-foreground", className)}>
      {ART.halo.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index + 2} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      <DotGroup dots={ART.guides} enter={1} loop="breathe" period={DOT_MOTION.period.breathe + 3} delay={0.6} />
      {ART.rows.map((dots, i) => {
        const order = i >= ART.currentIndex ? i + 1 : i;
        return <DotGroup key={i} dots={dots} enter={order} loop="flow" period={SCAN_PERIOD} delay={1.2 + order * 0.5} />;
      })}
      <DotGroup dots={ART.band} enter={ART.currentIndex} loop="breathe" period={DOT_MOTION.period.breathe} delay={1.4} />
      <DotGroup dots={ART.current} enter={ART.currentIndex} loop="glint" period={DOT_MOTION.period.glint} delay={1.2 + ART.currentIndex * 0.5} />
      <DotGroup dots={ART.bar} enter={ART.currentIndex} loop="breathe" period={8} delay={0.4} />
    </DotMatrixMotion>
  );
}
