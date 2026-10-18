import { useMemo } from "react";
import { COLORS } from "../theme";
import { SPRITES, SPRITE_PITCH, type SpriteKey } from "../sprites";

/** 网点统一 4px 整数间距，渲染时不缩放，避免摩尔纹。 */
export const PITCH = SPRITE_PITCH;

export type Pose = "main" | "blink" | "open" | "fail" | "wave";

function dotPath(dots: Array<[number, number, number]>) {
  return dots
    .map(([cx, cy, r]) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`)
    .join("");
}

function spriteDots(key: SpriteKey) {
  const dots: Array<[number, number, number]> = [];
  SPRITES[key].rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const r = (row.charCodeAt(x) - 48) / 10;
      if (r > 0) dots.push([(x + 0.5) * PITCH, (y + 0.5) * PITCH, r]);
    }
  });
  return dots;
}

const pathCache = new Map<string, string>();

function cachedPath(key: string, build: () => Array<[number, number, number]>) {
  let d = pathCache.get(key);
  if (!d) {
    d = dotPath(build());
    pathCache.set(key, d);
  }
  return d;
}

/** 项目人物的 1-bit 调幅半调：只有墨／纸两值，永不上色、不描边。 */
export function Sprite({
  name,
  color = COLORS.ink,
  style,
}: {
  name: SpriteKey;
  color?: string;
  style?: React.CSSProperties;
}) {
  const size = SPRITES[name].cells * PITCH;
  const d = useMemo(() => cachedPath(name, () => spriteDots(name)), [name]);
  return (
    <svg width={size} height={size} style={{ display: "block", ...style }} aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

/** 主角卷卷：浅底用墨点，黑场用白点（取自深色素材，亮部出点）。 */
export function Hero({ pose, dark = false }: { pose: Pose; dark?: boolean }) {
  const name = (dark ? `a-${pose}-dark` : `a-${pose}`) as SpriteKey;
  return <Sprite name={name} color={dark ? COLORS.white : COLORS.ink} />;
}

type Mask = (x: number, y: number) => boolean;

const circle = (cx: number, cy: number, r: number): Mask => (x, y) =>
  (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

function segmentDistance(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSq));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

const line = (x0: number, y0: number, x1: number, y1: number, width: number): Mask => (x, y) =>
  segmentDistance(x, y, x0, y0, x1, y1) <= width / 2;

const union = (...masks: Mask[]): Mask => (x, y) => masks.some((mask) => mask(x, y));

function questionMask(): Mask {
  const band: Mask = (x, y) => circle(24, 17, 11.2)(x, y) && !circle(24, 17, 5.6)(x, y);
  const topArc: Mask = (x, y) => band(x, y) && y <= 25;
  const rightTail: Mask = (x, y) => band(x, y) && x >= 23 && y >= 18 && y <= 26;
  return union(topArc, rightTail, line(24, 26, 22.6, 35, 5), circle(22.4, 45, 3));
}

/** 半调问号：在 48×50 的设计网格上按 3 倍细分取样，统一点径。 */
export function QuestionMark({ color = COLORS.ink }: { color?: string }) {
  const sub = 3;
  const cols = 48 * sub;
  const rows = 50 * sub;
  const d = useMemo(
    () =>
      cachedPath("question", () => {
        const mask = questionMask();
        const dots: Array<[number, number, number]> = [];
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            if (!mask((x + 0.5) / sub, (y + 0.5) / sub)) continue;
            dots.push([(x + 0.5) * PITCH, (y + 0.5) * PITCH, 1.5]);
          }
        }
        return dots;
      }),
    [cols, rows],
  );
  return (
    <svg width={cols * PITCH} height={rows * PITCH} style={{ display: "block" }} aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}
