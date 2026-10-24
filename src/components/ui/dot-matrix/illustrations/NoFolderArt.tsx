import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import {
  bayer,
  clamp,
  createRandom,
  type Dot,
  grid,
  halo,
  line,
  memoDots,
  ringBuckets,
  sample,
  smoothstep,
  sparkle,
} from "../geometry";
import { rippleDelay } from "../motion";


const TREE_W = 216;
const TREE_H = 150;
const CARD = { x: 30, y: 8, w: 156, h: 128 };
const ROWS: [number, number][] = [
  [0, 84],
  [14, 66],
  [14, 76],
  [28, 50],
  [0, 92],
];
const TREE_RINGS = 5;
const TRAIL_SIZE = 40;
const FADE_W = 248;
const FADE_H = 150;
const FADE_RINGS = 5;
const SCATTER_W = 104;
const SCATTER_H = 84;

function buildTree() {
  const { x: x0, y: y0, w, h } = CARD;
  const edge = (a: [number, number], b: [number, number]) => line(a, b);
  const frame = sample(
    [
      edge([x0 + 10, y0], [x0 + w - 10, y0]),
      edge([x0 + w - 10, y0], [x0 + w, y0 + 10]),
      edge([x0 + w, y0 + 10], [x0 + w, y0 + h - 10]),
      edge([x0 + w, y0 + h - 10], [x0 + w - 10, y0 + h]),
      edge([x0 + w - 10, y0 + h], [x0 + 10, y0 + h]),
      edge([x0 + 10, y0 + h], [x0, y0 + h - 10]),
      edge([x0, y0 + h - 10], [x0, y0 + 10]),
      edge([x0, y0 + 10], [x0 + 10, y0]),
    ],
    6,
  ).map(([x, y]): Dot => ({ x, y, r: 0.9, o: 0.3 }));
  const rows = ROWS.map(([indent, len], k) => {
    const y = y0 + 22 + k * 21,
      gx = x0 + 18 + indent,
      op = 0.78 - k * 0.1;
    const dots: Dot[] = [];
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++)
        dots.push({
          x: gx + a * 3,
          y: y - 3 + b * 3,
          r: 1.05,
          o: k === 0 ? 1 : op,
          accent: k === 0,
        });
    for (let x = gx + 14; x < gx + 14 + len; x += 4)
      dots.push({
        x,
        y,
        r: 1,
        o: op * 0.75 * (1 - ((x - gx - 14) / len) * 0.4),
      });
    return dots;
  });
  const guide = sample([line([x0 + 22, y0 + 30], [x0 + 22, y0 + 72])], 4).map(
    ([x, y]): Dot => ({ x, y, r: 0.7, o: 0.22 }),
  );
  const inCard = (x: number, y: number) =>
    x > x0 - 6 && x < x0 + w + 6 && y > y0 - 6 && y < y0 + h + 6;
  const bg = halo(TREE_W, TREE_H, 108, 72, 130, {
    pitch: 8,
    skip: inCard,
    max: 0.15,
  });
  return {
    frame,
    rows,
    guide,
    bg: ringBuckets(bg, { cx: 108, cy: 72, n: TREE_RINGS }),
  };
}

function buildTrail() {
  const pts = sample([line([20, 3], [20, 24])], 5);
  const path = pts.map(
    ([x, y], k): Dot => ({ x, y, r: 0.9 + k * 0.08, o: 0.3 + k * 0.12 }),
  );
  const chevron = (
    [
      [13, 27],
      [16.5, 30.5],
      [20, 34],
      [23.5, 30.5],
      [27, 27],
    ] as const
  ).map(([x, y]): Dot => ({ x, y, r: 1.25, o: 1, accent: true }));
  return { path, chevron };
}

function buildFade() {
  const dots = grid(FADE_W, FADE_H, 10, (_x, y, i, j) => {
    const t = smoothstep(clamp((y - 24) / (FADE_H - 24))) * clamp(1 - _x / 330);
    if (t <= 0.02 || bayer(i, j) > 0.3 + t * 0.9) return null;
    return { r: t > 0.5 ? 1.1 : t > 0.25 ? 0.9 : 0.7, o: 0.03 + t * 0.17 };
  });
  return ringBuckets(dots, { cx: 0, cy: FADE_H, n: FADE_RINGS });
}

function buildScatter() {
  const rand = createRandom(23);
  const dots: Dot[] = [];
  for (let k = 0; k < 16; k++) {
    const x = SCATTER_W - 8 - rand() * 80,
      y = 8 + rand() * 64,
      d = Math.hypot(SCATTER_W - x, y) / 110;
    const r = 0.65 + rand() * 0.5;
    if (Math.hypot(x - (SCATTER_W - 30), y - 30) < 14) continue;
    dots.push({ x, y, r, o: 0.08 + (1 - d) * 0.22 });
  }
  const small = sparkle(SCATTER_W, SCATTER_H, SCATTER_W - 64, 54, 5, 2.2).map(
    (d): Dot => ({ ...d, o: d.o * 0.4, accent: false }),
  );
  const big = sparkle(SCATTER_W, SCATTER_H, SCATTER_W - 30, 30, 10, 2.6);
  return {
    scatter: ringBuckets(dots, { cx: SCATTER_W, cy: 0, n: 3 }),
    small,
    big,
  };
}

const TREE = memoDots("noFolder:tree", buildTree);
const TRAIL = memoDots("noFolder:trail", buildTrail);
const FADE = memoDots("noFolder:fade", buildFade);
const SCATTER = memoDots("noFolder:scatter", buildScatter);

export function NoFolderTreeArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion
      width={TREE_W}
      height={TREE_H}
      origin={[50, 45]}
      className={className}
    >
      {TREE.bg.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={14}
          delay={1 + (index / TREE_RINGS) * 14 * 0.4}
        />
      ))}
      <DotGroup
        dots={TREE.frame}
        enter={1}
        loop="breathe"
        period={12}
        delay={0.6}
      />
      <DotGroup dots={TREE.guide} enter={2} />
      {TREE.rows.map((dots, k) => (
        <DotGroup
          key={k}
          dots={dots}
          enter={2 + k}
          loop={k === 0 ? "glint" : "flow"}
          period={k === 0 ? 9 : 10}
          delay={1.2 + k * 0.6}
        />
      ))}
    </DotMatrixMotion>
  );
}

export function NoFolderTrailArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion
      width={TRAIL_SIZE}
      height={TRAIL_SIZE}
      origin={[50, 0]}
      className={className}
    >
      {TRAIL.path.map((dot, k) => (
        <DotGroup
          key={k}
          dots={[dot]}
          enter={3 + k}
          loop="flow"
          period={7}
          delay={1 + k * 0.38}
        />
      ))}
      <DotGroup
        dots={TRAIL.chevron}
        enter={8}
        loop="flow"
        period={7}
        delay={1 + TRAIL.path.length * 0.38}
      />
    </DotMatrixMotion>
  );
}

export function NoFolderFadeArt({
  className,
  motion,
}: {
  className?: string;
  motion?: "auto" | "corner";
}) {
  return (
    <DotMatrixMotion
      width={FADE_W}
      height={FADE_H}
      origin={[0, 100]}
      motion={motion}
      className={className}
    >
      {FADE.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={12}
          delay={0.8 + rippleDelay(index, FADE_RINGS)}
        />
      ))}
    </DotMatrixMotion>
  );
}

export function NoFolderScatterArt({
  className,
  motion,
}: {
  className?: string;
  motion?: "auto" | "corner";
}) {
  return (
    <DotMatrixMotion
      width={SCATTER_W}
      height={SCATTER_H}
      origin={[100, 0]}
      motion={motion}
      className={className}
    >
      {SCATTER.scatter.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="breathe"
          period={13}
          delay={0.6 + index * 1.4}
        />
      ))}
      <DotGroup
        dots={SCATTER.small}
        enter={3}
        loop="breathe"
        period={11}
        delay={2}
      />
      <DotGroup
        dots={SCATTER.big}
        enter={4}
        loop="glint"
        period={10}
        delay={2.6}
      />
    </DotMatrixMotion>
  );
}
