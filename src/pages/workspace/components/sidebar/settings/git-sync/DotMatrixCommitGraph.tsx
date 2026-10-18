import {
  astroid,
  clamp,
  createRandom,
  type Dot,
  DOT_MOTION,
  DotGroup,
  DotMatrixMotion,
  grid,
  line,
  ringBuckets,
  sample,
  type Point,
  type Segment,
} from "@/components/ui/dot-matrix";

const ART_W = 240;
const ART_H = 190;
const MAIN_Y = 124;
const BRANCH_Y = 64;
/** 流速：每像素 12ms，整条主干约 2.6s 流完。 */
const FLOW_S_PER_PX = 0.012;
const FLOW_BIN_S = 0.24;
const HALO_RINGS = 6;

type Node = { x: number; y: number; r: number; kind: "solid" | "ring" | "head" };

const NODES: Node[] = [
  { x: 46, y: MAIN_Y, r: 8, kind: "solid" },
  { x: 88, y: MAIN_Y, r: 8, kind: "solid" },
  { x: 142, y: MAIN_Y, r: 8, kind: "solid" },
  { x: 126, y: BRANCH_Y, r: 8, kind: "ring" },
  { x: 162, y: BRANCH_Y, r: 8, kind: "ring" },
  { x: 196, y: MAIN_Y, r: 11, kind: "head" },
];

const nearNode = (x: number, y: number, pad: number) =>
  NODES.some((n) => Math.hypot(x - n.x, y - n.y) < n.r + pad);

function sparkle(sx: number, sy: number, sR: number) {
  return grid(ART_W, ART_H, 4, (x, y) => {
    const k = astroid(x - sx, y - sy, sR);
    if (k > 1) return null;
    const t = 1 - k;
    return { r: 0.7 + t * 1.1, o: 0.55 + t * 0.45, accent: true };
  });
}

function nodeDots(n: Node) {
  return grid(
    ART_W,
    ART_H,
    3.2,
    (x, y) => {
      const d = Math.hypot(x - n.x, y - n.y);
      if (d > n.r) return null;
      const light = clamp(0.5 + (n.x - x + (n.y - y)) / (n.r * 3));
      if (n.kind === "ring") return d > n.r - 3.4 ? { r: 0.9, o: 0.4 + light * 0.3 } : null;
      const t = 1 - d / n.r;
      if (n.kind === "head") return { r: 0.7 + t * 0.8, o: 0.6 + t * 0.4, accent: true };
      return { r: 0.6 + t * 0.7, o: clamp(0.3 + t * 0.35 + light * 0.25) };
    },
    n.x % 3.2,
    n.y % 3.2,
  );
}

type FlowGroup = { key: string; delay: number; dots: Dot[] };

function buildCommitGraph() {
  const rand = createRandom(7);
  const my = MAIN_Y, by = BRANCH_Y;
  const inArt = (x: number, y: number) =>
    Math.abs(y - my) < 6 || nearNode(x, y, 4) || (x > 88 && x < 200 && y > by - 6 && y < my);

  const halo = grid(ART_W, ART_H, 6, (x, y) => {
    if (inArt(x, y)) return null;
    const d = Math.hypot((x - 120) * 0.85, y - 98);
    if (d >= 104) return null;
    const t = 1 - d / 104;
    if (rand() > 0.3 + t * 0.6) return null;
    return { r: 0.55 + t * 0.5, o: 0.05 + t * 0.17 };
  });

  // 到达时间：主干从左向右；分支自 88 节点分出，经上方两个提交回到汇合点
  const branchPath: Segment[] = [
    [[88, my], [88, 88], [100, by], [126, by]],
    line([126, by], [162, by]),
    [[162, by], [186, by], [196, 90], [196, my]],
  ];
  const branchPts: Point[] = sample(branchPath, 5);
  const tMain = (x: number) => (x - 10) * FLOW_S_PER_PX;
  const tBranch = (k: number) => tMain(88) + (k + 1) * 5 * FLOW_S_PER_PX;
  const tHead = Math.max(tMain(196), tBranch(branchPts.length - 1)) + 0.04;

  const bins = new Map<number, Dot[]>();
  const put = (t: number, dot: Dot) => {
    const key = Math.round(t / FLOW_BIN_S);
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key)!.push(dot);
  };
  for (const [x, y] of sample([line([10, my], [230, my])], 5)) {
    if (nearNode(x, y, 3)) continue;
    const fade = clamp(Math.min(x - 10, 230 - x) / 34);
    put(x > 196 ? tHead + (x - 196) * FLOW_S_PER_PX : tMain(x), { x, y, r: 0.75 + fade * 0.45, o: 0.12 + fade * 0.48 });
  }
  branchPts.forEach(([x, y], k) => {
    if (!nearNode(x, y, 3)) put(tBranch(k), { x, y, r: 1.05, o: 0.5 });
  });
  const flow: FlowGroup[] = [...bins.keys()]
    .sort((a, b) => a - b)
    .map((key) => ({ key: `l${key}`, delay: key * FLOW_BIN_S, dots: bins.get(key)! }));

  const nodes: FlowGroup[] = NODES.map((n, i) => {
    let t: number;
    if (n.kind === "head") t = tHead;
    else if (n.y === my) t = tMain(n.x);
    else {
      let best = 0, bd = Infinity;
      branchPts.forEach(([x, y], k) => {
        const d = Math.hypot(x - n.x, y - n.y);
        if (d < bd) [bd, best] = [d, k];
      });
      t = tBranch(best);
    }
    return { key: `n${i}`, delay: t, dots: nodeDots(n) };
  });

  return {
    halo: ringBuckets(halo, { cx: 120, cy: 98, n: HALO_RINGS }),
    flow: [...flow, ...nodes],
    sparkles: [sparkle(214, 40, 13), sparkle(196, 26, 6)],
  };
}

const GRAPH = buildCommitGraph();
const P = DOT_MOTION.period;

/** 14 Git 提交图：光晕缓慢呼吸，亮度沿主干与分支慢慢流过节点，品牌蓝小星偶尔微亮。 */
export function DotMatrixCommitGraph({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={ART_W} height={ART_H} origin={[50, (98 / ART_H) * 100]} className={className}>
      {GRAPH.halo.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="breathe" period={P.breathe + 1} delay={index * 0.6} />
      ))}
      <DotGroup enter={0}>
        {GRAPH.flow.map(({ key, delay, dots }) => (
          <DotGroup key={key} dots={dots} enter={false} loop="flow" period={P.flow} delay={delay} />
        ))}
      </DotGroup>
      {GRAPH.sparkles.map((dots, i) => (
        <DotGroup key={i} dots={dots} enter={HALO_RINGS} loop="glint" period={P.glint} delay={2.6 + i * 0.8} />
      ))}
    </DotMatrixMotion>
  );
}
