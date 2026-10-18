/** 小点阵图标：24 单位坐标，[形状, 色类, 透明度] 取第一个命中；与设计稿 ICONS 同参。 */
import { clamp, type Dot } from "../geometry";
import { ARC, AST, C, OR, POLY, RING, RRS, S, type Shape } from "./shapes";

/** d 中性（currentColor）／a 品牌蓝／e 错误色 */
export type IconTone = "d" | "a" | "e";
type IconPart = [Shape, IconTone, number];

const docBody = RRS(4.5, 2.5, 15, 19, 2.6, 2);
const docLines = OR(S(8.5, 9, 15.5, 9, 1.6), S(8.5, 12.5, 15.5, 12.5, 1.6), S(8.5, 16, 12.5, 16, 1.6));
const qMark = (cx: number, cy: number) => OR(C(cx, cy, 3.6), S(cx - 3.1, cy - 0.8, cx + 0.6, cy - 8.8, 2.3));

export const DOT_ICONS = {
  doc: [[docLines, "d", 0.55], [docBody, "d", 0.85]],
  docErr: [[OR(S(12, 7, 12, 13, 2.2), C(12, 16.6, 1.3)), "e", 1], [docBody, "d", 0.8]],
  docQuestion: [
    [C(12, 17.4, 1.2), "a", 1],
    [OR(ARC(12, 10, 3, 1.8, -180, 60), S(12, 12.8, 12, 14.4, 1.8)), "d", 0.85],
    [docBody, "d", 0.45],
  ],
  fileX: [[OR(S(9.2, 10.5, 14.8, 16.5, 1.9), S(14.8, 10.5, 9.2, 16.5, 1.9)), "a", 1], [docBody, "d", 0.85]],
  chat: [
    [OR(S(8, 8.5, 16, 8.5, 1.6), S(8, 12, 13, 12, 1.6)), "d", 0.5],
    [OR(RRS(3, 3.5, 18, 13.5, 3.2, 2), POLY([[6.5, 16], [6.5, 21], [12, 16.5]])), "d", 0.82],
  ],
  search: [
    [C(8.2, 8.2, 1.5), "a", 1],
    [OR(RING(10.5, 10.5, 6.6, 2.1), S(15.4, 15.4, 20.6, 20.6, 2.6)), "d", 0.85],
    [C(10.5, 10.5, 5.3), "d", 0.12],
  ],
  history: [
    [C(12, 12, 1.6), "a", 1],
    [
      OR(
        ARC(12, 12, 8.5, 2, -150, 180),
        S(12, 12, 12, 7.2, 1.9),
        S(12, 12, 15.2, 13.8, 1.9),
        POLY([[1.4, 6.6], [7.6, 7.2], [3.8, 11.8]]),
      ),
      "d",
      0.85,
    ],
  ],
  sparkleOff: [[AST(19.8, 4.2, 3.2), "a", 0.95], [AST(11, 13, 9.5), "d", 0.38]],
  quote: [[qMark(7.5, 15), "a", 1], [qMark(16.5, 15), "a", 0.8]],
} satisfies Record<string, IconPart[]>;

export type DotIconName = keyof typeof DOT_ICONS;
export type IconDot = Dot & { tone: IconTone };

/** 统一点距：按显示尺寸取档，点径两档（中性 .34／强调 .40），统一左上受光。 */
export const iconPitch = (size: number) => (size <= 20 ? 1.9 : size <= 32 ? 2.2 : size <= 44 ? 2.6 : 3);

/** 在 (x0, y0) 处画 size 尺寸的图标；返回点与命中函数（光晕避让用）。 */
export function iconDots(name: DotIconName, x0: number, y0: number, size: number) {
  const parts: IconPart[] = DOT_ICONS[name];
  const pitch = iconPitch(size), k = size / 24, st = pitch / k;
  const off = (24 - Math.floor(24 / st) * st) / 2 + st / 2;
  const dots: IconDot[] = [];
  for (let v = off; v < 24; v += st) {
    for (let u = off; u < 24; u += st) {
      for (const [f, tone, o] of parts) {
        if (!f(u, v)) continue;
        const light = clamp(0.5 + (12 - u + (12 - v)) / 36);
        const neutral = tone === "d";
        dots.push({
          x: x0 + u * k,
          y: y0 + v * k,
          r: Math.max(0.3, pitch * (neutral ? 0.34 * (0.9 + light * 0.2) : 0.4)),
          o: o * (neutral ? 0.74 + light * 0.26 : 1),
          accent: tone === "a",
          tone,
        });
        break;
      }
    }
  }
  const hit = (x: number, y: number) => {
    const u = (x - x0) / k, v = (y - y0) / k;
    return u >= 0 && u <= 24 && v >= 0 && v <= 24 && parts.some(([f]) => f(u, v));
  };
  return { dots, hit };
}
