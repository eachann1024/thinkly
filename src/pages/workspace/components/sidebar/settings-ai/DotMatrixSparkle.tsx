import {
  astroid,
  clamp,
  createRandom,
  type Dot,
  DOT_MOTION,
  DotGroup,
  DotMatrixMotion,
  grid,
  ringBuckets,
  rippleDelay,
} from "@/components/ui/dot-matrix";

export { DotMatrixCorners } from "@/components/ui/dot-matrix";

const ART_W = 220;
const ART_H = 190;
const CX = 104;
const CY = 100;
const RINGS = 8;

function buildSparkleDots() {
  const rand = createRandom(7);
  const skip = () => {
    rand();
    rand();
  };
  const R = 78;
  const sx = 172, sy = 42, sR = 24;
  return grid(ART_W, ART_H, 6, (x, y) => {
    const ks = astroid(x - sx, y - sy, sR);
    if (ks <= 1) {
      const t = 1 - ks;
      skip();
      return { r: 0.9 + t * 1.3, o: 0.55 + t * 0.45, accent: true };
    }
    const k = astroid(x - CX, y - CY, R);
    if (k <= 1) {
      const t = 1 - k;
      skip();
      const light = clamp(0.5 + (CX - x + (CY - y)) / (R * 3));
      return { r: 0.8 + t * 1.5, o: clamp(0.18 + t * 0.55 + light * 0.25) };
    }
    const d = Math.hypot(x - CX, y - CY);
    if (d < 92) {
      const t = 1 - d / 92;
      if (rand() > 0.35 + t * 0.6) return null;
      return { r: 0.55 + t * 0.5, o: 0.05 + t * 0.18 };
    }
    return null;
  });
}

const ALL_DOTS = buildSparkleDots();
const NEUTRAL_RINGS = ringBuckets(
  ALL_DOTS.filter((d) => !d.accent),
  { cx: CX, cy: CY, n: RINGS },
);
const ACCENT_DOTS: Dot[] = ALL_DOTS.filter((d) => d.accent);
const RIPPLE = DOT_MOTION.period.ripple;

export function DotMatrixSparkle({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={ART_W} height={ART_H} origin={[(CX / ART_W) * 100, (CY / ART_H) * 100]} className={className}>
      {NEUTRAL_RINGS.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      <DotGroup dots={ACCENT_DOTS} enter={RINGS} loop="glint" period={DOT_MOTION.period.glint} delay={2} />
    </DotMatrixMotion>
  );
}
