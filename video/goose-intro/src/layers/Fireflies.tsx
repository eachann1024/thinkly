import { useCurrentFrame } from 'remotion';
import { EASE_BREEZE, EASE_SOFT, tween } from '../motion';
import { HEIGHT, LIGHT_DISSOLVE, S5, S5_GATHER, WIDTH } from '../timeline';

const COUNT = 24;
const FLIGHT = 110;
const ROW = { x0: 900, y: 790, gap: 20 };

const rand = (n: number) => {
  const x = Math.sin(n * 78.233 + 5.1) * 43758.5453;
  return x - Math.floor(x);
};

const flies = Array.from({ length: COUNT }, (_, i) => {
  const sx = 80 + rand(i * 3 + 1) * (WIDTH - 160);
  const sy = 90 + rand(i * 3 + 2) * (HEIGHT * 0.7);
  const ex = ROW.x0 + i * ROW.gap;
  const bend = (rand(i * 3 + 3) - 0.5) * 520;
  return {
    sx,
    sy,
    ex,
    cx: (sx + ex) / 2 + bend,
    cy: Math.min(sy, ROW.y) - 140 - rand(i + 40) * 160,
    delay: Math.round(rand(i + 7) * 30),
  };
});

/** 24 只萤火沿弧线汇聚到笔记本上方排成一行（单个二次贝塞尔路径）。 */
export const Fireflies = () => {
  const frame = useCurrentFrame() + S5.from;
  const fadeIn = tween(frame, [S5.from, S5.from + 30], [0, 1], EASE_SOFT);
  const bloom = tween(frame, [LIGHT_DISSOLVE.from, LIGHT_DISSOLVE.cut], [1, 7], EASE_SOFT);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {flies.map((f, i) => {
        const p = tween(frame, [S5_GATHER.from + f.delay, S5_GATHER.from + f.delay + FLIGHT], [0, 1], EASE_BREEZE);
        const q = 1 - p;
        const x = q * q * f.sx + 2 * q * p * f.cx + p * p * f.ex;
        const y = q * q * f.sy + 2 * q * p * f.cy + p * p * ROW.y;
        const r = 9 * bloom;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - r * 3,
              top: y - r * 3,
              width: r * 6,
              height: r * 6,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #fff6c8 0%, rgba(255,236,160,0.85) 18%, rgba(255,222,130,0.3) 45%, rgba(255,222,130,0) 70%)',
            }}
          />
        );
      })}
    </div>
  );
};
