/** 点阵坐标生成工具：只在模块加载时调用一次，结果作为常量复用。 */

export type Dot = { x: number; y: number; r: number; o: number; accent?: boolean };
export type DotStyle = Omit<Dot, "x" | "y">;
export type Point = [number, number];
export type Segment = [Point, Point, Point, Point];

export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** 四角星（星芒）等值函数：≤1 时在形状内。 */
export const astroid = (dx: number, dy: number, R: number) =>
  Math.pow(Math.abs(dx) / R, 2 / 3) + Math.pow(Math.abs(dy) / R, 2 / 3);

/** 与效果图一致的 Lehmer 伪随机序列；同一种子得到同一分布。 */
export function createRandom(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** 4×4 有序抖动阈值：渐隐密度均匀且贴合网格。 */
export const bayer = (i: number, j: number) => BAYER[(((i % 4) + 4) % 4) + (((j % 4) + 4) % 4) * 4];

export function grid(
  w: number,
  h: number,
  step: number,
  fn: (x: number, y: number, i: number, j: number) => DotStyle | null,
  ox = 0,
  oy = 0,
) {
  const dots: Dot[] = [];
  let j = 0;
  for (let y = step / 2 + oy; y < h; y += step, j++) {
    let i = 0;
    for (let x = step / 2 + ox; x < w; x += step, i++) {
      const dot = fn(x, y, i, j);
      if (dot) dots.push({ x, y, ...dot });
    }
  }
  return dots;
}

/** 以 (cx, cy) 为网格原点，让中心点恰好落在格点上。 */
export function gridAt(
  w: number,
  h: number,
  step: number,
  cx: number,
  cy: number,
  fn: (x: number, y: number, i: number, j: number) => DotStyle | null,
) {
  const ox = (((cx - step / 2) % step) + step) % step;
  const oy = (((cy - step / 2) % step) + step) % step;
  const i0 = Math.round((step / 2 + ox - cx) / step);
  const j0 = Math.round((step / 2 + oy - cy) / step);
  return grid(w, h, step, (x, y, i, j) => fn(x, y, i + i0, j + j0), ox, oy);
}

/** 渐隐：沿 (x, y) 计算 0–1 的权重，低于抖动阈值的点被剔除。 */
export function fadeField(
  w: number,
  h: number,
  step: number,
  weight: (x: number, y: number) => number,
  { max = 0.15, density = 1 }: { max?: number; density?: number } = {},
) {
  return grid(w, h, step, (x, y, i, j) => {
    const t = clamp(weight(x, y));
    if (t <= 0.02 || bayer(i, j) > (0.3 + t * 0.9) * density) return null;
    return { r: t > 0.5 ? 1.1 : t > 0.25 ? 0.9 : 0.7, o: 0.03 + t * max };
  });
}

/** 光晕：网格对齐 + 有序抖动 + smoothstep 渐隐 + 三档点径。 */
export function halo(
  w: number,
  h: number,
  cx: number,
  cy: number,
  R: number,
  {
    skip = () => false,
    pitch = 6,
    max = 0.16,
    density = 1,
  }: { skip?: (x: number, y: number) => boolean; pitch?: number; max?: number; density?: number } = {},
) {
  return gridAt(w, h, pitch, cx, cy, (x, y, i, j) => {
    if (skip(x, y)) return null;
    const d = Math.hypot((x - cx) * 0.85, y - cy);
    if (d >= R) return null;
    const s = smoothstep(1 - d / R);
    if (bayer(i, j) > (0.16 + s * 0.7) * density) return null;
    const tier = s > 0.6 ? 1 : s > 0.3 ? 0.84 : 0.68;
    return { r: (tier * pitch) / 6, o: 0.04 + s * max };
  });
}

/** 环形：半径 r、线宽 width 的点阵圆环。 */
export function ring(cx: number, cy: number, r: number, width: number, pitch = 3.2, style: DotStyle = { r: 0.9, o: 0.5 }) {
  return gridAt(cx + r + pitch, cy + r + pitch, pitch, cx, cy, (x, y) =>
    Math.abs(Math.hypot(x - cx, y - cy) - r) <= width / 2 ? style : null,
  );
}

/** 品牌蓝四角星。 */
export function sparkle(w: number, h: number, sx: number, sy: number, sR: number, pitch = 4) {
  return grid(
    w,
    h,
    pitch,
    (x, y) => {
      const k = astroid(x - sx, y - sy, sR);
      if (k > 1) return null;
      const t = 1 - k;
      return { r: ((0.7 + t * 1.1) * pitch) / 4, o: 0.55 + t * 0.45, accent: true };
    },
    0,
    0,
  );
}

export const line = (a: Point, b: Point): Segment => [
  a,
  [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3],
  [a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3],
  b,
];

/** 三次贝塞尔路径按弧长等距取点。 */
export function sample(segs: Segment[], gap: number) {
  const pts: Point[] = [];
  let acc = gap;
  let prev: Point | null = null;
  for (const [p0, p1, p2, p3] of segs) {
    for (let i = 0; i <= 200; i++) {
      const t = i / 200, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      if (prev) acc += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
      if (acc >= gap) {
        pts.push([x, y]);
        acc = 0;
      }
    }
  }
  return pts;
}

/** 按到中心的距离把点分成 n 个同心环（由内向外），用于入场与波纹错峰。 */
export function ringBuckets(
  dots: Dot[],
  { cx, cy, n = 8, dist }: { cx: number; cy: number; n?: number; dist?: (d: Dot) => number },
) {
  const measure = dist ?? ((d: Dot) => Math.hypot(d.x - cx, d.y - cy));
  const ds = dots.map(measure);
  const maxD = Math.max(1e-6, ...ds);
  const buckets: Dot[][] = Array.from({ length: n }, () => []);
  dots.forEach((d, k) => buckets[Math.min(n - 1, Math.floor((ds[k] / maxD) * n))].push(d));
  return buckets.map((list, index) => ({ index, dots: list })).filter((b) => b.dots.length > 0);
}

const dotCache = new Map<string, unknown>();
/** 参数化点阵的模块级缓存：同一 key 只生成一次。 */
export function memoDots<T>(key: string, build: () => T): T {
  if (!dotCache.has(key)) dotCache.set(key, build());
  return dotCache.get(key) as T;
}
