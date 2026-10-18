import { cn } from "@/lib/utils";
import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { memoDots, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import { columnBins, dotIcon, type SettingsDotIconName } from "./settingsDotIcons";

/**
 * 设置卡片里的小点阵图标。
 * - sweep：一束光自左向右缓慢扫过（flow 按列错峰），用于文件夹、云
 * - ripple：亮度从中心向外慢慢扩散（ripple 按环错峰），用于无光晕的小图标
 * 品牌蓝点统一 glint 偶尔微亮。
 */
const MOTION: Record<SettingsDotIconName, { mode: "sweep" | "ripple"; period: number }> = {
  cloudOff: { mode: "sweep", period: 12 },
  folderPlus: { mode: "sweep", period: 11 },
  folderOff: { mode: "sweep", period: 13 },
  branch: { mode: "ripple", period: DOT_MOTION.period.ripple },
};

const SWEEP_BINS = 8;
const SWEEP_START_S = 1.5;
const SWEEP_STEP_S = 0.3;
const RIPPLE_RINGS = 3;

function build(name: SettingsDotIconName, size: number) {
  const dots = dotIcon(name, size);
  const neutral = dots.filter((d) => !d.accent);
  const accent = dots.filter((d) => d.accent);
  const { mode } = MOTION[name];
  const c = size / 2;
  return {
    accent,
    columns: mode === "sweep" ? columnBins(neutral, SWEEP_BINS) : [],
    rings: mode === "ripple" ? ringBuckets(neutral, { cx: c, cy: c, n: RIPPLE_RINGS }) : [],
  };
}

export function SettingsDotIcon({
  name,
  size,
  className,
}: {
  name: SettingsDotIconName;
  size: number;
  className?: string;
}) {
  const art = memoDots(`settings-icon:${name}:${size}`, () => build(name, size));
  const { period } = MOTION[name];
  return (
    <DotMatrixMotion width={size} height={size} className={cn("shrink-0 text-foreground", className)}>
      {art.columns.length > 0 && (
        <DotGroup enter={0}>
          {art.columns.map(({ index, dots }) => (
            <DotGroup
              key={index}
              dots={dots}
              enter={false}
              loop="flow"
              period={period}
              delay={SWEEP_START_S + index * SWEEP_STEP_S}
            />
          ))}
        </DotGroup>
      )}
      {art.rings.map(({ index, dots }) => (
        <DotGroup
          key={index}
          dots={dots}
          enter={index}
          loop="ripple"
          period={period}
          delay={rippleDelay(index, RIPPLE_RINGS, period)}
        />
      ))}
      {art.accent.length > 0 && (
        <DotGroup dots={art.accent} enter={RIPPLE_RINGS} loop="glint" period={DOT_MOTION.period.glint} delay={2} />
      )}
    </DotMatrixMotion>
  );
}
