import { clamp, type Dot } from "../geometry";
import { C, OR, POLY, RR, RRS, S, type Shape } from "./shapes";

/** 工作区缺省图的小点阵图标：24 单位坐标，按显示尺寸栅格化（与设计稿 drawIcon 同参）。 */

type Part = [shape: Shape, accent: boolean, opacity: number];

const ICONS = {
  folderOpen: [
    [POLY([[2.5, 20], [6.2, 11.5], [22.5, 11.5], [19, 20]]), false, 0.5],
    [OR(RRS(3, 5.5, 16, 14.5, 2.4, 2), RR(3, 4, 7, 3, 1.2)), false, 0.82],
  ],
  outline: [
    [S(3, 6, 5.5, 6, 2), true, 1],
    [S(8, 6, 21, 6, 2), false, 0.55],
    [OR(S(6, 12, 18, 12, 1.8), S(6, 18, 15, 18, 1.8)), false, 0.28],
  ],
  dots: [
    [C(4, 12, 2), true, 1],
    [C(12, 12, 2), false, 0.45],
    [C(20, 12, 2), false, 0.25],
  ],
} satisfies Record<string, Part[]>;

export type WorkspaceDotIconName = keyof typeof ICONS;

const iconPitch = (size: number) => (size <= 20 ? 1.9 : size <= 32 ? 2.2 : size <= 44 ? 2.6 : 3);

/** 栅格化图标；hit 判断画布坐标是否落在图标形状内（供光晕避让）。 */
export function workspaceDotIcon(name: WorkspaceDotIconName, size: number, x0 = 0, y0 = 0) {
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
  const hit: Shape = (x, y) => {
    const u = (x - x0) / k, v = (y - y0) / k;
    return u >= 0 && u <= 24 && v >= 0 && v <= 24 && parts.some(([f]) => f(u, v));
  };
  return { dots, hit };
}
