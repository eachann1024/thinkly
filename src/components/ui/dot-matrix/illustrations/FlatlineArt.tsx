import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { bayer, clamp, type Dot, grid, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";

const W = 300;
const H = 72;
const RINGS = 6;
const WAVE_BINS = 10;
const WAVE_PERIOD = DOT_MOTION.period.wave;
const PHASE_PER_COLUMN = 1 / 18;

function build() {
  const base: Dot[] = [];
  const field = grid(W, H, 10, (x, y, i, j) => {
    const fade = clamp((x / W) * 1.4);
    if (y > 60) {
      base.push(x > W - 10 ? { x, y, r: 2.2, o: 0.95, accent: true } : { x, y, r: 1.1, o: 0.12 + fade * 0.38 });
      return null;
    }
    if (j < 3 && bayer(i, j) > 0.5 + y / H) return null;
    return { r: 0.7, o: (0.03 + fade * 0.07) * (y / H + 0.3) };
  });
  const per = Math.ceil(base.length / WAVE_BINS);
  const waves = Array.from({ length: WAVE_BINS }, (_, b) => {
    const list = base.slice(b * per, (b + 1) * per);
    return {
      index: b,
      neutral: list.filter((d) => !d.accent),
      accent: list.filter((d) => d.accent),
      delay: -((b * per + (per - 1) / 2) * PHASE_PER_COLUMN) * WAVE_PERIOD,
    };
  }).filter((w) => w.neutral.length + w.accent.length > 0);
  return { field: ringBuckets(field, { cx: W / 2, cy: H, n: RINGS }), waves };
}

const ART = build();
const RIPPLE = DOT_MOTION.period.ripple;

export function FlatlineArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={W} height={H} origin={[50, 100]} className={className}>
      {ART.field.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      <DotGroup enter={2}>
        {ART.waves.map(({ index, neutral, accent, delay }) => (
          <DotGroup key={index} dots={neutral} enter={false} loop="wave" period={WAVE_PERIOD} delay={delay}>
            {accent.length > 0 ? (
              <DotGroup dots={accent} enter={false} loop="glint" period={DOT_MOTION.period.glint} delay={2} />
            ) : null}
          </DotGroup>
        ))}
      </DotGroup>
    </DotMatrixMotion>
  );
}
