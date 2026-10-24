import { cn } from "@/lib/utils";
import { DotGroup } from "./Dots";
import { DotMatrixMotion } from "./DotMatrixMotion";
import {
  clamp,
  type Dot,
  grid,
  memoDots,
  ringBuckets,
  sample,
  type Segment,
} from "./geometry";
import { DOT_MOTION, rippleDelay } from "./motion";

export type CornerPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const POSITION_CLASS: Record<CornerPosition, string> = {
  "top-left": "left-0 top-0",
  "top-right": "right-0 top-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

const isLeft = (p: CornerPosition) => p.endsWith("left");
const isTop = (p: CornerPosition) => p.startsWith("top");
const local = (p: CornerPosition, size: number, x: number, y: number) =>
  [isLeft(p) ? x : size - x, isTop(p) ? y : size - y] as const;
const cornerOrigin = (p: CornerPosition): [number, number] => [
  isLeft(p) ? 0 : 100,
  isTop(p) ? 0 : 100,
];

type Rings = { index: number; dots: Dot[] }[];

function CornerSvg({
  position,
  size,
  rings,
  period,
  className,
}: {
  position: CornerPosition;
  size: number;
  rings: Rings;
  period: number;
  className?: string;
}) {
  const count = rings.length ? rings[rings.length - 1].index + 1 : 1;
  return (
    <DotMatrixMotion
      width={size}
      height={size}
      origin={cornerOrigin(position)}
      motion="corner"
      className={cn(
        "pointer-events-none absolute text-foreground",
        POSITION_CLASS[position],
        className,
      )}
    >
      {rings.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={period}
          delay={rippleDelay(index, count, period)}
        />
      ))}
    </DotMatrixMotion>
  );
}

export function CornerTriangle({
  position,
  size = 132,
  pitch = 10,
  max = 0.22,
  className,
}: {
  position: CornerPosition;
  size?: number;
  pitch?: number;
  max?: number;
  className?: string;
}) {
  const rings = memoDots(`triangle:${position}:${size}:${pitch}:${max}`, () => {
    const dots = grid(size, size, pitch, (u, v) => {
      const k = (u + v) / size;
      if (k > 1) return null;
      const t = 1 - k;
      return { r: (0.6 + t * 0.9) * (pitch / 10), o: 0.06 + t * max };
    }).map((d) => ({
      ...d,
      x: isLeft(position) ? d.x : size - d.x,
      y: isTop(position) ? d.y : size - d.y,
    }));
    return ringBuckets(dots, {
      cx: 0,
      cy: 0,
      n: 5,
      dist: (d) => local(position, size, d.x, d.y).reduce((a, b) => a + b, 0),
    });
  });
  return (
    <CornerSvg
      position={position}
      size={size}
      rings={rings}
      period={DOT_MOTION.period.ripple + 2}
      className={className}
    />
  );
}

export function CornerCrosshair({
  position,
  size = 56,
  arm = 14,
  pitch = 3,
  max = 0.32,
  className,
}: {
  position: CornerPosition;
  size?: number;
  arm?: number;
  pitch?: number;
  max?: number;
  className?: string;
}) {
  const rings = memoDots(
    `crosshair:${position}:${size}:${arm}:${pitch}:${max}`,
    () => {
      const c = size / 2;
      const dots: Dot[] = [{ x: c, y: c, r: pitch * 0.42, o: max + 0.1 }];
      for (let s = pitch * 1.5; s <= arm; s += pitch) {
        const t = 1 - s / (arm + pitch);
        const style = { r: pitch * (0.22 + t * 0.12), o: 0.05 + t * max };
        dots.push(
          { x: c + s, y: c, ...style },
          { x: c - s, y: c, ...style },
          { x: c, y: c + s, ...style },
          { x: c, y: c - s, ...style },
        );
      }
      return ringBuckets(dots, { cx: c, cy: c, n: 3 });
    },
  );
  return (
    <DotMatrixMotion
      width={size}
      height={size}
      motion="corner"
      className={cn(
        "pointer-events-none absolute text-foreground",
        POSITION_CLASS[position],
        className,
      )}
    >
      {rings.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="breathe"
          period={DOT_MOTION.period.breathe + 2}
          delay={index * 0.8}
        />
      ))}
    </DotMatrixMotion>
  );
}

export function CornerArc({
  position,
  size = 120,
  radius = 96,
  gap = 6,
  max = 0.26,
  className,
}: {
  position: CornerPosition;
  size?: number;
  radius?: number;
  gap?: number;
  max?: number;
  className?: string;
}) {
  const rings = memoDots(
    `arc:${position}:${size}:${radius}:${gap}:${max}`,
    () => {
      const k = 0.5523 * radius;
      const seg: Segment = [
        [radius, 0],
        [radius, k],
        [k, radius],
        [0, radius],
      ];
      const pts = sample([seg], gap);
      const dots = pts.map(([u, v], n) => {
        const t = clamp(
          1 - Math.abs(n / Math.max(1, pts.length - 1) - 0.5) * 2,
        );
        return {
          x: isLeft(position) ? u : size - u,
          y: isTop(position) ? v : size - v,
          r: 0.7 + t * 0.4,
          o: 0.06 + t * max,
        };
      });
      const index = new Map(dots.map((d, n) => [d, n]));
      return ringBuckets(dots, {
        cx: 0,
        cy: 0,
        n: 6,
        dist: (d) => index.get(d) ?? 0,
      });
    },
  );
  return (
    <CornerSvg
      position={position}
      size={size}
      rings={rings}
      period={DOT_MOTION.period.ripple}
      className={className}
    />
  );
}

export function DotMatrixCorners({
  positions = ["top-left", "bottom-right"],
  size,
  pitch,
  max,
}: {
  positions?: CornerPosition[];
  size?: number;
  pitch?: number;
  max?: number;
}) {
  return (
    <>
      {positions.map((position) => (
        <CornerTriangle
          key={position}
          position={position}
          size={size}
          pitch={pitch}
          max={max}
        />
      ))}
    </>
  );
}
