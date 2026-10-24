import { clamp, type Dot } from "../geometry";


type Shape = (x: number, y: number) => boolean;
type Part = [shape: Shape, accent: boolean, opacity: number];

const dSeg = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? clamp(((x - ax) * dx + (y - ay) * dy) / l) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};
const C = (cx: number, cy: number, r: number): Shape => (x, y) => Math.hypot(x - cx, y - cy) <= r;
const RING = (cx: number, cy: number, r: number, w: number): Shape => (x, y) =>
  Math.abs(Math.hypot(x - cx, y - cy) - r) <= w / 2;
const S = (ax: number, ay: number, bx: number, by: number, w: number): Shape => (x, y) =>
  dSeg(x, y, ax, ay, bx, by) <= w / 2;
const RR = (l: number, t: number, w: number, h: number, r: number): Shape => (x, y) => {
  if (x < l || x > l + w || y < t || y > t + h) return false;
  const qx = Math.max(l + r - x, 0, x - (l + w - r)), qy = Math.max(t + r - y, 0, y - (t + h - r));
  return qx * qx + qy * qy <= r * r;
};
const RRS = (l: number, t: number, w: number, h: number, r: number, s: number): Shape => {
  const o = RR(l, t, w, h, r), i = RR(l + s, t + s, w - 2 * s, h - 2 * s, Math.max(r - s, 0));
  return (x, y) => o(x, y) && !i(x, y);
};
const OR = (...f: Shape[]): Shape => (x, y) => f.some((g) => g(x, y));
const NOT = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && !b(x, y);

const cloud = OR(C(8, 14.5, 4.6), C(13, 10.5, 5.8), C(17.5, 14.5, 4.2), RR(3.5, 13, 18, 6.4, 3.2));
const cloudIn = OR(C(8, 14.5, 2.6), C(13, 10.5, 3.8), C(17.5, 14.5, 2.2), RR(5.5, 14.8, 14, 2.6, 1.3));
const folderShape = OR(RRS(3, 8, 18, 12, 2.6, 2), RR(3, 5.5, 8, 4.5, 1.6));
const slash = S(3, 3, 21, 21, 1.9);
const slashGap = S(3, 3, 21, 21, 4.4);

const ICONS = {
  cloudOff: [
    [slash, false, 0.85],
    [NOT(NOT(cloud, cloudIn), slashGap), false, 0.85],
    [NOT(cloudIn, slashGap), false, 0.14],
  ],
  branch: [
    [RING(18, 7, 2.4, 1.9), true, 1],
    [OR(RING(6, 5.5, 2.4, 1.9), RING(6, 18.5, 2.4, 1.9), S(6, 8, 6, 16, 1.9), S(18, 9.5, 18, 10.6, 1.9), S(18, 10.6, 8.2, 16.6, 1.9)), false, 0.85],
  ],
  folderPlus: [
    [OR(S(18, 14.2, 18, 21.8, 2.3), S(14.2, 18, 21.8, 18, 2.3)), true, 1],
    [NOT(OR(RRS(2, 7, 17, 12, 2.6, 2), RR(2, 4.5, 7.5, 4.5, 1.6)), C(18, 18, 5.2)), false, 0.78],
  ],
  folderOff: [
    [slash, false, 0.85],
    [NOT(folderShape, slashGap), false, 0.55],
  ],
} satisfies Record<string, Part[]>;

export type SettingsDotIconName = keyof typeof ICONS;

const iconPitch = (size: number) => (size <= 20 ? 1.9 : size <= 32 ? 2.2 : size <= 44 ? 2.6 : 3);

export function dotIcon(name: SettingsDotIconName, size: number, x0 = 0, y0 = 0): Dot[] {
  const parts: Part[] = ICONS[name];
  const pitch = iconPitch(size), k = size / 24, st = pitch / k;
  const off = (24 - Math.floor(24 / st) * st) / 2 + st / 2;
  const dots: Dot[] = [];
  for (let v = off; v < 24; v += st)
    for (let u = off; u < 24; u += st)
      for (const [f, accent, o] of parts) {
        if (!f(u, v)) continue;
        const light = clamp(0.5 + (12 - u + (12 - v)) / 36);
        const r = accent ? pitch * 0.4 : pitch * 0.34 * (0.9 + light * 0.2);
        dots.push({
          x: x0 + u * k,
          y: y0 + v * k,
          r: Math.max(r, 0.3),
          o: accent ? o : o * (0.74 + light * 0.26),
          accent: accent || undefined,
        });
        break;
      }
  return dots;
}

export function columnBins(dots: Dot[], bins: number) {
  const xs = dots.map((d) => d.x);
  const x0 = Math.min(...xs), bw = (Math.max(...xs) - x0) / bins || 1;
  const cols: Dot[][] = Array.from({ length: bins }, () => []);
  for (const d of dots) cols[Math.min(bins - 1, Math.floor((d.x - x0) / bw))].push(d);
  return cols.map((list, index) => ({ index, dots: list })).filter((c) => c.dots.length > 0);
}
