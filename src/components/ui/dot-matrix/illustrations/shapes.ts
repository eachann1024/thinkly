/** 点阵图标的形状谓词：在 24 单位坐标里判断点是否落在形状内。 */
import { astroid, clamp } from "../geometry";

export type Shape = (x: number, y: number) => boolean;

const dSeg = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? clamp(((x - ax) * dx + (y - ay) * dy) / l) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};

/** 圆 */
export const C = (cx: number, cy: number, r: number): Shape => (x, y) => Math.hypot(x - cx, y - cy) <= r;
/** 圆环 */
export const RING = (cx: number, cy: number, r: number, w: number): Shape => (x, y) =>
  Math.abs(Math.hypot(x - cx, y - cy) - r) <= w / 2;
/** 线段（粗细 w） */
export const S = (ax: number, ay: number, bx: number, by: number, w: number): Shape => (x, y) =>
  dSeg(x, y, ax, ay, bx, by) <= w / 2;
/** 圆角矩形 */
export const RR = (l: number, t: number, w: number, h: number, r: number): Shape => (x, y) => {
  if (x < l || x > l + w || y < t || y > t + h) return false;
  const qx = Math.max(l + r - x, 0, x - (l + w - r));
  const qy = Math.max(t + r - y, 0, y - (t + h - r));
  return qx * qx + qy * qy <= r * r;
};
/** 圆角矩形描边（线宽 s） */
export const RRS = (l: number, t: number, w: number, h: number, r: number, s: number): Shape => {
  const outer = RR(l, t, w, h, r);
  const inner = RR(l + s, t + s, w - 2 * s, h - 2 * s, Math.max(r - s, 0));
  return (x, y) => outer(x, y) && !inner(x, y);
};
/** 多边形 */
export const POLY = (pts: [number, number][]): Shape => (x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
/** 四角星 */
export const AST = (cx: number, cy: number, R: number): Shape => (x, y) => astroid(x - cx, y - cy, R) <= 1;
export const OR = (...f: Shape[]): Shape => (x, y) => f.some((g) => g(x, y));
export const NOT = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && !b(x, y);
/** 圆弧：角度 a0 → a1（度，顺时针为正） */
export const ARC = (cx: number, cy: number, r: number, w: number, a0: number, a1: number): Shape => (x, y) => {
  if (Math.abs(Math.hypot(x - cx, y - cy) - r) > w / 2) return false;
  let a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  if (a < a0) a += 360;
  return a <= a1;
};
