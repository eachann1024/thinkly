import { cn } from "@/lib/utils";
import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { clamp, type Dot, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import "./glitch-art.css";

const W = 200;
const H = 70;
const P = 5;
const RINGS = 6;
const ROWS = [{ y: 8, e: 190 }, { y: 24, e: 170 }, { y: 40, e: 180 }, { y: 56, e: 112 }];

function build() {
  const flat: Dot[] = [];
  const shifted: Dot[] = [];
  ROWS.forEach(({ y, e }, i) => {
    for (let x = P / 2; x < e; x += P) {
      if (i === 2 && x > 72 && x < 94) continue;
      const fade = 0.35 + clamp((e - x) / 40) * 0.65;
      if (i === 2 && x >= 94) shifted.push({ x, y: y + 4, r: 1.15, o: 0.26 * fade });
      else flat.push({ x, y, r: 1.15, o: 0.5 * fade });
    }
  });
  return {
    rows: ringBuckets(flat, { cx: 83, cy: 40, n: RINGS }),
    shifted,
    accent: [{ x: 83, y: 40, r: 2.1, o: 0.95, accent: true }] as Dot[],
  };
}

const ART = build();
const RIPPLE = DOT_MOTION.period.ripple;

/**
 * 16 正文渲染失败：错位的一行文字。文字行波纹缓慢外扩；错位段与品牌蓝缺口一次轻抖后缓慢呼吸。
 * 宿主带 goose-glitch-host、按钮带 data-dm-arm 时，悬停按钮让错位段回正一点、缺口微放大（预备态）。
 */
export function GlitchArt({ className, scale = 1 }: { className?: string; scale?: number }) {
  return (
    <DotMatrixMotion width={Math.round(W * scale)} height={Math.round(H * scale)} viewBox={`0 0 ${W} ${H}`} origin={[42, 57]} className={cn("shrink-0 text-foreground", className)}>
      {ART.rows.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      <DotGroup enter={3} loop="alert">
        <g className="goose-glitch-fix">
          <DotGroup dots={ART.shifted} enter={false} />
        </g>
        <g className="goose-glitch-gap">
          <DotGroup dots={ART.accent} enter={false} />
        </g>
      </DotGroup>
    </DotMatrixMotion>
  );
}
