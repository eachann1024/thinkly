import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { astroid, bayer, clamp, type Dot, grid, halo, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import { columnBins } from "./settingsDotIcons";
import { OR, POLY } from "./shapes";

const W = 220;
const H = 180;
const P = 4;
const CX = 110;
const CY = 104;
const RINGS = 8;
const COLUMNS = 10;
const SWEEP_PERIOD = 12;

const left = POLY([[24, 58], [106, 70], [106, 156], [24, 144]]);
const right = POLY([[114, 70], [196, 58], [196, 144], [114, 156]]);
const page = OR(left, right);
const ribbon = POLY([[162, 54], [174, 52], [174, 108], [168, 100], [162, 108]]);
const onEdge = (x: number, y: number) => !page(x - P, y) || !page(x + P, y) || !page(x, y - P) || !page(x, y + P);
const topL = (x: number) => 58 + ((x - 24) * 12) / 82;
const topR = (x: number) => 70 - ((x - 114) * 12) / 82;
const LINE_ROWS = [16, 28, 40, 52, 64];

/** 品牌蓝四角星：网格原点对齐星心（与设计稿一致）。 */
function star(sx: number, sy: number, sR: number, pitch = 4) {
  return grid(
    W,
    H,
    pitch,
    (x, y) => {
      const k = astroid(x - sx, y - sy, sR);
      if (k > 1) return null;
      const t = 1 - k;
      return { r: ((0.7 + t * 1.1) * pitch) / 4, o: 0.55 + t * 0.45, accent: true };
    },
    sx % pitch,
    sy % pitch,
  );
}

function buildBook() {
  const haloDots = halo(W, H, 110, 106, 108, {
    skip: (x, y) => page(x, y) || ribbon(x, y) || (x > 104 && x < 116 && y > 62 && y < 162),
    pitch: 7,
    max: 0.15,
    density: 0.85,
  });
  const body: Dot[] = grid(W, H, P, (x, y, i, j) => {
    if (ribbon(x, y)) return { r: 1.2, o: 0.95, accent: true };
    if (x > 106 && x < 114 && y > 66 && y < 160) return { r: 1.05, o: 0.5 };
    if (!page(x, y)) return null;
    if (onEdge(x, y)) return { r: 1.1, o: 0.6 };
    const isL = x < CX, d = y - (isL ? topL(x) : topR(x));
    const xs = isL ? [34, 98] : [122, 186];
    for (let r = 0; r < LINE_ROWS.length; r++) {
      const end = r === LINE_ROWS.length - 1 ? xs[0] + (xs[1] - xs[0]) * 0.55 : xs[1];
      if (Math.abs(d - LINE_ROWS[r]) < P / 2 && x > xs[0] && x < end) return { r: 0.95, o: 0.42 };
    }
    if (bayer(i, j) > 0.26) return null;
    const L = clamp(0.55 - (x - 24) / 400 - (y - 58) / 260);
    return { r: 0.6, o: 0.07 + L * 0.1 };
  });
  const halfW = W / 2;
  return {
    halo: ringBuckets(haloDots, { cx: CX, cy: CY, n: RINGS }),
    columns: columnBins(body.filter((d) => !d.accent), COLUMNS).map((col) => {
      const xc = col.dots.reduce((s, d) => s + d.x, 0) / col.dots.length;
      return { ...col, enter: Math.round((Math.abs(xc - CX) / halfW) * (RINGS - 1)) };
    }),
    ribbon: body.filter((d) => d.accent),
    stars: [...star(196, 30, 13), ...star(178, 16, 5, 3)],
  };
}

const ART = buildBook();
const RIPPLE = DOT_MOTION.period.ripple;

/** 01 无打开页面：展开书本 + 品牌蓝书签。光晕波纹外扩；书页一束光自左向右扫过；书签与小星偶尔微亮。 */
export function BookArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={W} height={H} origin={[(CX / W) * 100, (CY / H) * 100]} className={className}>
      {ART.halo.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      {ART.columns.map(({ index, dots, enter }) => (
        <DotGroup key={index} dots={dots} enter={enter} loop="flow" period={SWEEP_PERIOD} delay={1.5 + index * 0.26} />
      ))}
      <DotGroup dots={ART.ribbon} enter={RINGS - 2} loop="glint" period={DOT_MOTION.period.glint + 2} delay={1.2} />
      <DotGroup dots={ART.stars} enter={RINGS} loop="glint" period={DOT_MOTION.period.glint} delay={2.2} />
    </DotMatrixMotion>
  );
}
