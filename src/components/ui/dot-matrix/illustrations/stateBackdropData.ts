import { grid, line, sample, type Dot, type Point } from "../geometry";
import type { DotLoop } from "../motion";

export type StateBackdropKind = "outline" | "openError" | "webdav" | "aiLoading" | "aiModel" | "aiError" | "opening" | "visible";
export type BackdropGroup = { dots: Dot[]; loop: DotLoop; period: number; delay: number };
const W = 320, H = 190;

function path(points: Point[], opacity = 0.16, gap = 6): Dot[] {
  return sample(points.slice(1).map((point, index) => line(points[index], point)), gap)
    .map(([x, y]) => ({ x, y, r: 0.9, o: opacity }));
}

function arc(cx: number, cy: number, rx: number, ry: number, start: number, end: number, opacity = 0.14): Dot[] {
  const steps = Math.ceil(Math.abs(end - start) * Math.max(rx, ry) / 6);
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = start + (end - start) * index / steps;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, r: 0.85, o: opacity };
  });
}

function group(dots: Dot[], index: number, loop: DotLoop = "ripple", period = 12): BackdropGroup {
  return { dots, loop, period, delay: index * period / 7 };
}

function build(kind: StateBackdropKind): BackdropGroup[] {
  switch (kind) {
    case "outline":
      return [
        path([[23, 41], [23, 125], [61, 125]], 0.19),
        path([[39, 58], [39, 103], [72, 103]], 0.14),
        path([[281, 53], [281, 142], [247, 142]], 0.17),
        path([[263, 73], [263, 124], [245, 124]], 0.12),
      ].map((dots, index) => group(dots, index));
    case "openError":
      return [
        [...path([[25, 63], [25, 36], [78, 36]], 0.18), ...path([[242, 153], [288, 153], [288, 128]], 0.13)],
        [...path([[38, 53], [38, 47], [71, 47]], 0.12), ...path([[249, 141], [276, 141], [276, 132]], 0.18)],
        [...path([[18, 91], [55, 91]], 0.14), ...path([[268, 87], [302, 87]], 0.11)],
      ].map((dots, index) => group(dots, index, "breathe", 14));
    case "webdav":
      return [0, 1, 2].map(index => group([
        ...arc(68, 87, 38 + index * 14, 24 + index * 11, 3.5, 5.5, 0.19 - index * 0.035),
        ...arc(249, 107, 33 + index * 13, 20 + index * 10, 0.15, 1.8, 0.18 - index * 0.035),
      ], index, "ripple", 12));
    case "aiLoading":
      return [0, 1, 2].map(index => group([
        ...path([[23 + index * 8, 53 + index * 23], [71, 53 + index * 23]], 0.18),
        ...path([[250, 66 + index * 23], [296 - index * 8, 66 + index * 23]], 0.18),
      ], index, "progress", 4));
    case "aiModel":
      return [
        path([[64, 41], [36, 41], [36, 122], [64, 122]], 0.17),
        path([[79, 56], [51, 56], [51, 137], [79, 137]], 0.11),
        path([[244, 58], [279, 58], [279, 140], [244, 140]], 0.17),
        path([[255, 44], [294, 44], [294, 126]], 0.1),
      ].map((dots, index) => group(dots, index, "breathe", 14));
    case "aiError":
      return [0, 1, 2].map(index => group(grid(W, H, 8, (x, y, i, j) => {
        if ((x > 78 && x < 242) || (i * 7 + j * 11) % 5 !== index) return null;
        const field = 1 - Math.abs(y - 95) / 82;
        return field > 0 ? { r: (i + j) % 3 === 0 ? 1 : 0.65, o: field * 0.16 } : null;
      }), index, "breathe", 14));
    case "opening":
      return [0, 1, 2, 3].map(index => group([
        ...path([[30 + index * 7, 45 + index * 27], [76, 45 + index * 27]], 0.17),
        ...path([[246, 45 + index * 27], [290 - index * 7, 45 + index * 27]], 0.17),
        ...path([[92 + index * 6, 174], [228 - index * 6, 174]], 0.07 + index * 0.025, 8),
      ], index, "progress", 4));
    case "visible":
      return [0, 1, 2].map(index => group([
        ...arc(264, 95, 18 + index * 15, 10 + index * 8, 0, Math.PI * 2, 0.19 - index * 0.035),
      ], index, "ripple", 12));
  }
}

export const STATE_BACKDROPS = Object.fromEntries(
  (["outline", "openError", "webdav", "aiLoading", "aiModel", "aiError", "opening", "visible"] as const)
    .map(kind => [kind, build(kind)]),
) as Record<StateBackdropKind, BackdropGroup[]>;
