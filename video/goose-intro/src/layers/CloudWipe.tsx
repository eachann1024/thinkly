import { useCurrentFrame } from 'remotion';
import { EASE_BREEZE, tween } from '../motion';
import { CLOUD_WIPE, HEIGHT, WIDTH } from '../timeline';

const CLOUD_W = 4400;
const rand = (n: number) => {
  const x = Math.sin(n * 91.7 + 13.3) * 24634.6345;
  return x - Math.floor(x);
};

type Puff = { cx: number; cy: number; r: number; shade: boolean };

const buildPuffs = (): Puff[] => {
  const puffs: Puff[] = [];
  const taper = 720;
  for (let x = 120, i = 0; x < CLOUD_W - 100; x += 150, i += 1) {
    const edge = Math.min(x, CLOUD_W - x);
    const t = Math.min(1, edge / taper);
    const half = 360 + 560 * t * t;
    for (let y = HEIGHT / 2 - half; y <= HEIGHT / 2 + half; y += 150) {
      const k = i * 31 + Math.round(y);
      const r = 190 + rand(k) * 130;
      puffs.push({
        cx: x + (rand(k + 1) - 0.5) * 90,
        cy: y + (rand(k + 2) - 0.5) * 70,
        r,
        shade: rand(k + 3) > 0.7,
      });
    }
  }
  return puffs;
};

const PUFFS = buildPuffs();

/** 手绘云团自右向左横扫，中点（切点帧）整幅遮满。 */
export const CloudWipe = () => {
  const frame = useCurrentFrame();
  if (frame < CLOUD_WIPE.from || frame > CLOUD_WIPE.to) return null;
  const startX = WIDTH;
  const endX = -CLOUD_W;
  const x = tween(frame, [CLOUD_WIPE.from, CLOUD_WIPE.to], [startX, endX], EASE_BREEZE);
  return (
    <svg
      width={CLOUD_W}
      height={HEIGHT}
      style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${x}px)` }}
    >
      <defs>
        <filter id="cloud-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <g filter="url(#cloud-soft)">
        {PUFFS.map((p, i) => (
          <circle key={`s${i}`} cx={p.cx} cy={p.cy + 34} r={p.r} fill="#eadfc6" />
        ))}
        {PUFFS.map((p, i) => (
          <circle key={`l${i}`} cx={p.cx} cy={p.cy} r={p.r * 0.96} fill={p.shade ? '#f7f1e2' : '#fdfaf1'} />
        ))}
      </g>
    </svg>
  );
};
