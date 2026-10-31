import { cn } from "@/lib/utils";
import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import type { Dot, Point } from "../geometry";
import { DOT_MOTION } from "../motion";

const W = 196;
const H = 156;
const RADIUS = 1.45;

function polyline(points: Point[], opacity: number, gap = 5.2): Dot[] {
  const dots: Dot[] = [];
  let remainder = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    let along = remainder;
    for (; along < length; along += gap) {
      dots.push({
        x: x0 + ((x1 - x0) * along) / length,
        y: y0 + ((y1 - y0) * along) / length,
        r: RADIUS,
        o: opacity,
      });
    }
    remainder = along - length;
  }
  return dots;
}

const FRAME = [
  ...polyline([
    [60, 32], [60.6, 28.9], [62.3, 26.3], [64.9, 24.6],
    [68, 24], [116, 24], [140, 48], [140, 124],
    [139.4, 127.1], [137.7, 129.7], [135.1, 131.4], [132, 132],
    [68, 132], [64.9, 131.4], [62.3, 129.7], [60.6, 127.1],
    [60, 124], [60, 32],
  ], 0.3),
  ...polyline([[116, 29], [116, 48], [135, 48]], 0.3),
];
const GUIDES = [
  ...polyline([[75, 69], [75, 111], [83, 111]], 0.28, 5),
  ...polyline([[80, 81], [86, 81]], 0.28, 5),
  ...polyline([[90, 89], [90, 96], [98, 96]], 0.28, 5),
];
const ROWS = [
  ...polyline([[90, 61], [131, 61]], 0.68, 5),
  ...polyline([[90, 81], [126, 81]], 0.68, 5),
  ...polyline([[105, 96], [126, 96]], 0.68, 5),
  ...polyline([[90, 111], [116, 111]], 0.68, 5),
];
const SIGNAL: Dot[] = [[73, 59], [78, 59], [73, 64], [78, 64]].map(
  ([x, y]) => ({ x, y, r: RADIUS, o: 1, accent: true }),
);

export function OutlineArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion
      width={W}
      height={H}
      className={cn("shrink-0 text-foreground", className)}
    >
      <DotGroup dots={FRAME} enter={0} />
      <DotGroup dots={GUIDES} enter={1} />
      <DotGroup dots={ROWS} enter={2} />
      <DotGroup dots={SIGNAL} enter={3} loop="breathe" period={DOT_MOTION.period.breathe} delay={6} />
    </DotMatrixMotion>
  );
}
