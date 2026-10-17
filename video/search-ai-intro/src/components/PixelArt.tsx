import { useMemo } from "react";
import { COLORS } from "../theme";

type Mask = (x: number, y: number) => boolean;

const circle = (cx: number, cy: number, r: number): Mask => (x, y) =>
  (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const rect = (x0: number, y0: number, x1: number, y1: number): Mask => (x, y) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;

const ellipse = (cx: number, cy: number, rx: number, ry: number): Mask => (x, y) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function segmentDistance(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSq));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

const line = (x0: number, y0: number, x1: number, y1: number, width: number): Mask => (x, y) =>
  segmentDistance(x + 0.5, y + 0.5, x0, y0, x1, y1) <= width / 2;

const union = (...masks: Mask[]): Mask => (x, y) => masks.some((mask) => mask(x, y));
const subtract = (base: Mask, hole: Mask): Mask => (x, y) => base(x, y) && !hole(x, y);
const ring = (x0: number, y0: number, x1: number, y1: number, inset: number): Mask =>
  subtract(rect(x0, y0, x1, y1), rect(x0 + inset, y0 + inset, x1 - inset, y1 - inset));

export type Pose = "ask" | "type" | "point";

function personMask(pose: Pose): Mask {
  const head = circle(24, 14, 9.4);
  const eyes = union(circle(20.4, 10, 1.5), circle(27.6, 10, 1.5));
  const mouth = line(22.6, 13.4, 25.4, 13.4, 1.3);
  const face = subtract(head, union(circle(20.4, 10, 1.5), circle(27.6, 10, 1.5), mouth));
  const neck = rect(22, 21, 26, 26);
  const shoulders = union(rect(15, 27, 33, 46), circle(18, 28, 4), circle(30, 28, 4));
  const legs = union(line(21, 44, 20, 61, 5), line(27, 44, 28, 61, 5));
  const feet = union(rect(15, 60, 22, 62), rect(26, 60, 33, 62));
  const torso = union(shoulders, neck, legs, feet);

  if (pose === "type") {
    const arms = union(line(16, 30, 19, 41, 4), line(32, 30, 29, 41, 4));
    const laptop = union(ring(12, 44, 36, 50, 1.4), line(12, 50, 36, 50, 2));
    return union(face, torso, arms, laptop);
  }
  if (pose === "point") {
    const arms = union(line(33, 31, 41, 25, 4), line(15, 31, 11, 38, 4));
    return union(face, torso, arms);
  }
  const arms = union(line(15, 30, 10, 21, 4), line(12, 21, 16, 17, 3.4), line(33, 31, 38, 38, 4));
  return union(face, torso, arms);
}

function gooseMask(): Mask {
  const body = ellipse(19, 31, 12, 9);
  const neck = line(28, 27, 31, 13, 5);
  const head = circle(32, 10, 5);
  const beak = line(35, 11, 42, 12, 3);
  const tail = line(8, 28, 3, 23, 4);
  const feet = union(line(16, 39, 14, 46, 4), line(22, 39, 24, 46, 4), rect(11, 45, 18, 47), rect(21, 45, 28, 47));
  const eye = circle(33, 9, 1.2);
  return subtract(union(body, neck, head, beak, tail, feet), eye);
}

export function dotsOf(mask: Mask, cols: number, rows: number) {
  const dots: Array<[number, number]> = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (mask(x, y)) dots.push([x, y]);
    }
  }
  return dots;
}

export function PixelArt({
  kind,
  pose = "ask",
  pitch = 8,
  radius = 2,
  color = COLORS.ink,
  opacity = 1,
  style,
}: {
  kind: "person" | "goose";
  pose?: Pose;
  pitch?: number;
  radius?: number;
  color?: string;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  const cols = kind === "person" ? 48 : 46;
  const rows = kind === "person" ? 64 : 50;
  const dots = useMemo(
    () => dotsOf(kind === "person" ? personMask(pose) : gooseMask(), cols, rows),
    [kind, pose, cols, rows],
  );
  return (
    <svg
      width={cols * pitch}
      height={rows * pitch}
      style={{ overflow: "visible", opacity, ...style }}
      aria-hidden="true"
    >
      {dots.map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={(x + 0.5) * pitch}
          cy={(y + 0.5) * pitch}
          r={radius}
          fill={color}
        />
      ))}
    </svg>
  );
}
