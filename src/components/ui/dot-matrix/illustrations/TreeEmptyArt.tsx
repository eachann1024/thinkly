import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { bayer, clamp, type Dot, grid, ringBuckets, sample } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";

const TRAIL_W = 248;
const TRAIL_H = 26;
const TRAIL_RINGS = 6;
const TRAIL_PERIOD = 8;
const FADE_W = 248;
const FADE_H = 120;
const FADE_RINGS = 5;

/** 从空态文字末尾向上方 ＋ 弯折的点阵轨迹；右端距右边 24px，对齐侧栏头部的新建按钮。 */
function buildTrail() {
  const pts = sample([[[196, 22], [222, 22], [224, 12], [224, 5]]], 5);
  const dots: Dot[] = pts.map(([x, y], i) => {
    const t = i / Math.max(1, pts.length - 1);
    return { x, y, r: 0.8 + t * 0.4, o: 0.14 + t * 0.4 };
  });
  return {
    path: ringBuckets(dots, { cx: 196, cy: 22, n: TRAIL_RINGS }),
    tip: [{ x: 224, y: 1.8, r: 1.6, o: 0.95, accent: true }] as Dot[],
  };
}

/** 侧栏底部渐隐点阵，自左下角显现。 */
function buildFade() {
  const dots = grid(FADE_W, FADE_H, 10, (x, y, i, j) => {
    const t = clamp((y - 20) / 100) * clamp(1 - x / 300);
    if (t <= 0.02 || bayer(i, j) > 0.35 + t * 0.9) return null;
    return { r: t > 0.5 ? 1.1 : t > 0.25 ? 0.9 : 0.7, o: 0.03 + t * 0.15 };
  });
  return ringBuckets(dots, { cx: 0, cy: FADE_H, n: FADE_RINGS });
}

const TRAIL = buildTrail();
const FADE = buildFade();

/** 03 已关联：轨迹由文字向 ＋ 缓慢流动（波纹），末端品牌蓝点偶尔微亮。 */
export function TreeTrailArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={TRAIL_W} height={TRAIL_H} origin={[79, 85]} className={className}>
      {TRAIL.path.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={TRAIL_PERIOD}
          delay={rippleDelay(index, TRAIL_RINGS, TRAIL_PERIOD)}
        />
      ))}
      <DotGroup dots={TRAIL.tip} enter={TRAIL_RINGS} loop="glint" period={DOT_MOTION.period.glint} delay={2.4} />
    </DotMatrixMotion>
  );
}

/** 03 侧栏底部渐隐点阵：由左下角向外缓慢波纹。 */
export function TreeFadeArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={FADE_W} height={FADE_H} origin={[0, 100]} className={className}>
      {FADE.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" delay={rippleDelay(index, FADE_RINGS)} />
      ))}
    </DotMatrixMotion>
  );
}
