import { cn } from "@/lib/utils";
import { DotGroup, Dots } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { halo as haloField, memoDots, ringBuckets, type Dot } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import { iconDots, type DotIconName } from "./iconShapes";

/**
 * idle 静态缺省：光晕波纹 + 图标缓慢浮动，品牌蓝点微亮（无光晕的小图标自身做波纹）
 * progress 进行中：图标按行明暗扫过；progress-reverse 自下而上
 * alert 错误：图标一次短促横抖后转入缓慢呼吸
 */
export type DotIconMotion = "idle" | "progress" | "progress-reverse" | "alert";

const ERROR_COLOR = { color: "hsl(var(--destructive))" };
const HALO_RINGS = 6;
const ROW_BANDS = 8;
const FLOAT_PERIOD = 10;
const ROW_STEP = 0.18;

type Rings = { index: number; dots: Dot[] }[];
type IconArt = {
  halo: Rings;
  neutral: Dot[];
  accent: Dot[];
  error: Dot[];
  /** 无光晕时图标自身按环波纹 */
  rings: Rings;
  /** 进行中：按行分带（由上到下） */
  rows: Dot[][];
};

export type DotIconArtSpec = {
  icon: DotIconName;
  width: number;
  height: number;
  size: number;
  halo?: boolean;
  /** 额外避让区域（例如为角落装饰留白）；需配合 clearKey 区分缓存 */
  clear?: (x: number, y: number) => boolean;
  clearKey?: string;
};

export function buildDotIconArt({ icon, width: W, height: H, size, halo = false, clear, clearKey = "" }: DotIconArtSpec) {
  return memoDots<IconArt>(`icon-art:${icon}:${W}:${H}:${size}:${halo ? 1 : 0}:${clearKey}`, () => {
    const cx = W / 2, cy = H / 2;
    const { dots, hit } = iconDots(icon, (W - size) / 2, (H - size) / 2, size);
    const haloDots = halo
      ? haloField(W, H, cx, cy, Math.min(W * 0.62, H * 0.9), {
          skip: (x, y) => hit(x, y) || Boolean(clear?.(x, y)),
          pitch: size >= 48 ? 6 : 5,
          max: 0.15,
        })
      : [];
    const neutral = dots.filter((d) => d.tone === "d");
    const ys = [...new Set(dots.filter((d) => d.tone !== "e").map((d) => d.y.toFixed(2)))].sort((a, b) => +a - +b);
    const rows: Dot[][] = Array.from({ length: Math.min(ROW_BANDS, ys.length) }, () => []);
    dots.forEach((d) => {
      if (d.tone === "e") return;
      const r = ys.indexOf(d.y.toFixed(2));
      rows[Math.min(rows.length - 1, Math.floor((r * rows.length) / ys.length))].push(d);
    });
    return {
      halo: ringBuckets(haloDots, { cx, cy, n: HALO_RINGS }),
      neutral,
      accent: dots.filter((d) => d.tone === "a"),
      error: dots.filter((d) => d.tone === "e"),
      rings: ringBuckets(neutral, { cx, cy, n: 4 }),
      rows: rows.filter((r) => r.length > 0),
    };
  });
}

function HaloRings({ rings }: { rings: Rings }) {
  const period = DOT_MOTION.period.ripple;
  return rings.map(({ index, dots }) => (
    <DotGroup key={index} dots={dots} enter={index + 1} loop="ripple" period={period} delay={rippleDelay(index, HALO_RINGS, period)} />
  ));
}

/** 图标主体（不含 svg 容器），供组合插画复用。 */
export function DotIconBody({ art, motion = "idle", hasHalo }: { art: IconArt; motion?: DotIconMotion; hasHalo: boolean }) {
  if (motion === "progress" || motion === "progress-reverse") {
    const last = art.rows.length - 1;
    return (
      <DotGroup enter={0}>
        {art.rows.map((dots, r) => (
          <DotGroup
            key={r}
            dots={dots}
            enter={false}
            loop="progress"
            period={DOT_MOTION.period.progress}
            delay={(motion === "progress" ? r : last - r) * ROW_STEP}
          />
        ))}
      </DotGroup>
    );
  }
  if (motion === "alert") {
    return (
      <DotGroup enter={0} loop="alert">
        <Dots dots={art.neutral} />
        <g style={ERROR_COLOR}>
          <Dots dots={art.error} />
        </g>
        <Dots dots={art.accent} />
      </DotGroup>
    );
  }
  const accent = art.accent.length ? (
    <DotGroup dots={art.accent} enter={false} loop="glint" period={DOT_MOTION.period.glint} delay={2} />
  ) : null;
  if (!hasHalo) {
    // 小图标无光晕：自身按环波纹，品牌蓝点微亮
    return (
      <>
        {art.rings.map(({ index, dots }) => (
          <DotGroup key={index} dots={dots} enter={index} loop="ripple" delay={rippleDelay(index, 4)} />
        ))}
        {accent ? <DotGroup enter={0}>{accent}</DotGroup> : null}
      </>
    );
  }
  return (
    <DotGroup enter={0} loop="wave" period={FLOAT_PERIOD}>
      <Dots dots={art.neutral} />
      {accent}
    </DotGroup>
  );
}

/** 点阵图标缺省图：可选光晕；进行中／错误态由 motion 指定。 */
export function DotIconArt({
  motion = "idle",
  className,
  ...spec
}: DotIconArtSpec & { motion?: DotIconMotion; className?: string }) {
  const art = buildDotIconArt(spec);
  return (
    <DotMatrixMotion width={spec.width} height={spec.height} className={cn("shrink-0 text-foreground", className)}>
      <HaloRings rings={art.halo} />
      <DotIconBody art={art} motion={motion} hasHalo={Boolean(spec.halo)} />
    </DotMatrixMotion>
  );
}
