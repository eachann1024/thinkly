import { useCurrentFrame } from 'remotion';
import { EASE_BREEZE, tween } from '../motion';
import { HEIGHT, LEAF_WIPE, WIDTH } from '../timeline';

const GREENS = ['#6f9a45', '#8db04f', '#5e8a3c', '#a3b95a', '#7da24a', '#4f7d3a'];
const FEATHER = 280;
const LEAF_COUNT = 14;

/** 叶片风带的前沿 x：同时驱动 S4 的显现遮罩与叶片位置。 */
export const leafFront = (frame: number) =>
  tween(frame, [LEAF_WIPE.from, LEAF_WIPE.to], [-FEATHER - 200, WIDTH + 420], EASE_BREEZE);

export const leafMask = (frame: number) => {
  const x = leafFront(frame);
  const g = `linear-gradient(90deg, #000 ${x - FEATHER}px, transparent ${x}px)`;
  return { maskImage: g, WebkitMaskImage: g };
};

const leaves = Array.from({ length: LEAF_COUNT }, (_, i) => ({
  y: ((i + 0.5) / LEAF_COUNT) * (HEIGHT + 160) - 80 + (i % 3) * 14,
  off: ((i * 7) % 11) * 36 - 180,
  size: 190 + ((i * 5) % 7) * 34,
  color: GREENS[i % GREENS.length],
  amp: 40 + (i % 4) * 22,
  phase: i * 1.3,
  spin: 70 + (i % 5) * 38,
  tilt: (i * 47) % 360,
}));

export const LeafWipe = () => {
  const frame = useCurrentFrame();
  if (frame < LEAF_WIPE.from || frame > LEAF_WIPE.to) return null;
  const front = leafFront(frame);
  const t = tween(frame, [LEAF_WIPE.from, LEAF_WIPE.to], [0, 1], EASE_BREEZE);
  return (
    <>
      {leaves.map((l, i) => {
        const x = front + l.off;
        const y = l.y + Math.sin(t * 6.4 + l.phase) * l.amp;
        const rot = l.tilt + t * l.spin;
        return (
          <svg
            key={i}
            width={l.size}
            height={l.size * 1.8}
            viewBox="-30 -55 60 110"
            style={{
              position: 'absolute',
              left: x - l.size / 2,
              top: y - l.size * 0.9,
              transform: `rotate(${rot}deg)`,
            }}
          >
            <path d="M0 -52 C 30 -28 30 28 0 52 C -30 28 -30 -28 0 -52Z" fill={l.color} />
            <path d="M0 -50 L0 50" stroke="rgba(40,70,30,0.35)" strokeWidth="1.6" fill="none" />
            <path d="M0 -10 L14 -24 M0 10 L-14 -4 M0 -24 L-12 -34" stroke="rgba(40,70,30,0.25)" strokeWidth="1.2" fill="none" />
          </svg>
        );
      })}
    </>
  );
};
