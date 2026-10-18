import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { CornerPosition } from "./corners";
import { DotGroup } from "./Dots";
import { DotMatrixMotion } from "./DotMatrixMotion";
import {
  bayer,
  clamp,
  createRandom,
  type Dot,
  memoDots,
  ringBuckets,
} from "./geometry";
import { DOT_MOTION, rippleDelay } from "./motion";

/**
 * 缺省图容器的边角点阵装饰（与 corners.tsx 互补）：虚线刻度、散点星、栅格碎片。
 * 透明度 ≈ 0.12–0.25，循环周期 11–14s；由 DotDecor 统一放进容器查询层。
 */

const isLeft = (p: CornerPosition) => p.endsWith("left");
const isTop = (p: CornerPosition) => p.startsWith("top");

/** 以角为锚点、向内缩进 inset 的绝对定位。 */
function place(
  p: CornerPosition,
  inset: number | [number, number],
): CSSProperties {
  const [ix, iy] = Array.isArray(inset) ? inset : [inset, inset];
  return {
    [isLeft(p) ? "left" : "right"]: ix,
    [isTop(p) ? "top" : "bottom"]: iy,
  };
}

const SHAPE_CLASS = "pointer-events-none absolute text-foreground";

/** 虚线刻度：沿边缘的点阵标尺，每 5 格一根长刻度；自锚角向外渐隐，亮度沿刻度缓慢流过。 */
export function DecorTicks({
  position,
  axis = "x",
  length = 120,
  gap = 6,
  max = 0.22,
  inset = 14,
  className,
}: {
  position: CornerPosition;
  axis?: "x" | "y";
  length?: number;
  gap?: number;
  max?: number;
  inset?: number | [number, number];
  className?: string;
}) {
  const depth = 12;
  const bins = memoDots(
    `ticks:${position}:${axis}:${length}:${gap}:${max}`,
    () => {
      const dots: Dot[] = [];
      // 刻度贴着容器边：x 轴刻度向内（远离边）伸出，y 轴同理
      const fromStart = axis === "x" ? isLeft(position) : isTop(position);
      const edgeNear = axis === "x" ? isTop(position) : isLeft(position);
      const count = Math.floor(length / gap);
      for (let n = 0; n < count; n++) {
        const t = 1 - n / count;
        const along = fromStart
          ? gap / 2 + n * gap
          : length - gap / 2 - n * gap;
        const major = n % 5 === 0;
        const o = 0.05 + t * max;
        for (let k = 0; k < (major ? 3 : 1); k++) {
          const across = edgeNear ? 2 + k * 3.5 : depth - 2 - k * 3.5;
          const [x, y] = axis === "x" ? [along, across] : [across, along];
          dots.push({ x, y, r: major ? 0.95 : 0.75, o: k ? o * 0.8 : o });
        }
      }
      const order = (d: Dot) =>
        Math.abs((axis === "x" ? d.x : d.y) - (fromStart ? 0 : length));
      return ringBuckets(dots, { cx: 0, cy: 0, n: 6, dist: order });
    },
  );
  const [w, h] = axis === "x" ? [length, depth] : [depth, length];
  const period = DOT_MOTION.period.flow + 3;
  return (
    <DotMatrixMotion
      width={w}
      height={h}
      origin={[isLeft(position) ? 0 : 100, isTop(position) ? 0 : 100]}
      motion="corner"
      className={cn(SHAPE_CLASS, className)}
      style={place(position, inset)}
    >
      {bins.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="flow"
          period={period}
          delay={1 + index * 0.55}
        />
      ))}
    </DotMatrixMotion>
  );
}

/** 散点星：少量十字小星与单点随机散布（种子固定），分三组错峰缓慢微亮。 */
export function DecorScatter({
  position,
  width = 132,
  height = 88,
  count = 9,
  seed = 11,
  max = 0.24,
  accent = false,
  inset = 18,
  className,
}: {
  position: CornerPosition;
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
  max?: number;
  accent?: boolean;
  inset?: number | [number, number];
  className?: string;
}) {
  const groups = memoDots(
    `scatter:${width}:${height}:${count}:${seed}:${max}:${accent ? 1 : 0}`,
    () => {
      const rand = createRandom(seed);
      const out: Dot[][] = [[], [], []];
      for (let n = 0; n < count; n++) {
        const x = 6 + rand() * (width - 12),
          y = 6 + rand() * (height - 12);
        const big = rand() > 0.55;
        const o = 0.08 + rand() * (max - 0.08);
        const tint = accent && n === 0;
        const list = out[n % 3];
        list.push({
          x,
          y,
          r: big ? 1.15 : 0.85,
          o: tint ? Math.max(o, 0.22) : o,
          accent: tint,
        });
        if (big) {
          const arm = 3;
          for (const [dx, dy] of [
            [arm, 0],
            [-arm, 0],
            [0, arm],
            [0, -arm],
          ])
            list.push({
              x: x + dx,
              y: y + dy,
              r: 0.6,
              o: o * 0.6,
              accent: tint,
            });
        }
      }
      return out.filter((g) => g.length > 0);
    },
  );
  return (
    <DotMatrixMotion
      width={width}
      height={height}
      motion="corner"
      className={cn(SHAPE_CLASS, className)}
      style={place(position, inset)}
    >
      {groups.map((dots, i) => (
        <DotGroup
          key={i}
          dots={dots}
          enter={i * 2}
          loop="breathe"
          period={DOT_MOTION.period.breathe + 2 + i}
          delay={i * 1.7}
        />
      ))}
    </DotMatrixMotion>
  );
}

/** 栅格碎片：一块按有序抖动向外剥落的方格点阵，按对角带缓慢波纹。 */
export function DecorShard({
  position,
  cols = 7,
  rows = 5,
  pitch = 8,
  max = 0.22,
  inset = 20,
  className,
}: {
  position: CornerPosition;
  cols?: number;
  rows?: number;
  pitch?: number;
  max?: number;
  inset?: number | [number, number];
  className?: string;
}) {
  const w = cols * pitch,
    h = rows * pitch;
  const bands = memoDots(
    `shard:${position}:${cols}:${rows}:${pitch}:${max}`,
    () => {
      const dots: Dot[] = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          // 局部坐标 (u, v)：锚角处最密
          const u = isLeft(position) ? i : cols - 1 - i;
          const v = isTop(position) ? j : rows - 1 - j;
          const t = clamp(1 - (u / cols + v / rows) * 0.62);
          if (bayer(i, j) > t * 1.15) continue;
          dots.push({
            x: pitch / 2 + i * pitch,
            y: pitch / 2 + j * pitch,
            r: 0.7 + t * 0.45,
            o: 0.05 + t * max,
          });
        }
      }
      const cx = isLeft(position) ? 0 : w,
        cy = isTop(position) ? 0 : h;
      return ringBuckets(dots, {
        cx,
        cy,
        n: 4,
        dist: (d) => Math.abs(d.x - cx) + Math.abs(d.y - cy),
      });
    },
  );
  const period = DOT_MOTION.period.ripple + 1;
  return (
    <DotMatrixMotion
      width={w}
      height={h}
      origin={[isLeft(position) ? 0 : 100, isTop(position) ? 0 : 100]}
      motion="corner"
      className={cn(SHAPE_CLASS, className)}
      style={place(position, inset)}
    >
      {bands.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={period}
          delay={rippleDelay(index, 4, period)}
        />
      ))}
    </DotMatrixMotion>
  );
}
