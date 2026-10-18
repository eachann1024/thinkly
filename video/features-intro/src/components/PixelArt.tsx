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

export type Pose = "ask" | "type" | "point" | "raise" | "hold";
export type Kind = "person" | "goose" | "question";

function personMask(pose: Pose): Mask {
  const head = circle(24, 12, 8.6);
  const eyes = union(circle(20.8, 10.4, 1.7), circle(27.2, 10.4, 1.7));
  const mouth = line(22.5, 15.8, 25.5, 15.8, 1.4);
  const face = subtract(head, union(eyes, mouth));
  const neck = rect(22, 19, 26, 24);
  const torso = union(rect(18, 24, 30, 43), circle(19.4, 26, 2.6), circle(28.6, 26, 2.6));
  const legs = union(line(21.2, 41, 20.6, 55, 3.6), line(26.8, 41, 27.4, 55, 3.6));
  const feet = union(rect(17, 54, 22, 57), rect(26, 54, 31, 57));
  const hand = (x: number, y: number) => circle(x, y, 2);
  const body = union(face, torso, legs, feet, neck);

  if (pose === "type") {
    const arms = union(line(18, 29, 13, 38, 3.2), line(30, 29, 35, 38, 3.2), hand(12.6, 38.6), hand(35.4, 38.6));
    return union(body, arms);
  }
  if (pose === "point") {
    const arms = union(line(30, 29, 39, 24, 3.2), hand(40, 23.6), line(18, 29, 14, 38, 3.2), hand(13.6, 38.6));
    return union(body, arms);
  }
  if (pose === "raise") {
    const arms = union(line(18, 28, 12, 18, 3.2), hand(11.4, 17), line(30, 28, 36, 18, 3.2), hand(36.6, 17));
    return union(body, arms);
  }
  if (pose === "hold") {
    const arms = union(line(18, 29, 15, 23, 3.2), hand(14.6, 22.4), line(30, 29, 33, 23, 3.2), hand(33.4, 22.4));
    const note = union(ring(11, 13, 37, 21, 1.2), line(15, 17, 30, 17, 1));
    return union(body, arms, note);
  }
  const arms = union(line(30, 28, 37, 20, 3.2), hand(37.6, 19.2), line(18, 29, 14, 38, 3.2), hand(13.6, 38.6));
  return union(body, arms);
}

function questionMask(): Mask {
  const outer = circle(24, 17, 11.2);
  const inner = circle(24, 17, 5.6);
  const band = subtract(outer, inner);
  const topArc: Mask = (x, y) => band(x, y) && y <= 25;
  const rightTail: Mask = (x, y) => band(x, y) && x >= 23 && y >= 18 && y <= 26;
  const stem = line(24, 26, 22.6, 35, 5);
  const dot = circle(22.4, 45, 3);
  return union(topArc, rightTail, stem, dot);
}

function gooseMask(): Mask {
  const body = ellipse(19, 31, 12, 9);
  const neck = line(28, 27, 31, 13, 5);
  const head = circle(32, 10, 5);
  const beak = line(35, 11, 42, 12, 3);
  const tail = line(8, 28, 3, 23, 4);
  const feet = union(
    line(16, 39, 14, 46, 4),
    line(22, 39, 24, 46, 4),
    rect(11, 45, 18, 47),
    rect(21, 45, 28, 47),
  );
  const eye = circle(33, 9, 1.2);
  return subtract(union(body, neck, head, beak, tail, feet), eye);
}

const GRID: Record<Kind, [number, number]> = {
  person: [48, 64],
  goose: [46, 50],
  question: [48, 50],
};

function maskOf(kind: Kind, pose: Pose): Mask {
  if (kind === "goose") return gooseMask();
  if (kind === "question") return questionMask();
  return personMask(pose);
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

/** 1-bit 半调点阵：统一网点，永不上色（只有墨／纸两值）。 */
export function PixelArt({
  kind,
  pose = "ask",
  pitch = 6,
  radius = 2.1,
  color = COLORS.ink,
  opacity = 1,
  style,
}: {
  kind: Kind;
  pose?: Pose;
  pitch?: number;
  radius?: number;
  color?: string;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  const [cols, rows] = GRID[kind];
  const dots = useMemo(() => dotsOf(maskOf(kind, pose), cols, rows), [kind, pose, cols, rows]);
  return (
    <svg
      width={cols * pitch}
      height={rows * pitch}
      style={{ overflow: "visible", opacity, ...style }}
      aria-hidden="true"
    >
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={(x + 0.5) * pitch} cy={(y + 0.5) * pitch} r={radius} fill={color} />
      ))}
    </svg>
  );
}
