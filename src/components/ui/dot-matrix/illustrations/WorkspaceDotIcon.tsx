import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { memoDots, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import { columnBins } from "./settingsDotIcons";
import { workspaceDotIcon, type WorkspaceDotIconName } from "./workspaceDotIcons";

/**
 * sweep：一束光自左向右缓慢扫过（10 大纲为空）
 * ripple：自左向右按列波纹，小尺寸收敛为 3 环（19 树内空文件夹）
 */
export type WorkspaceDotIconMotion = "sweep" | "ripple";

const SWEEP_PERIOD = 12;

function build(icon: WorkspaceDotIconName, size: number, motion: WorkspaceDotIconMotion) {
  return memoDots(`ws-icon:${icon}:${size}:${motion}`, () => {
    const { dots } = workspaceDotIcon(icon, size);
    if (motion === "sweep") return { rings: columnBins(dots, size <= 28 ? 4 : 8), sweep: true };
    const n = size <= 20 ? 3 : 6;
    return { rings: ringBuckets(dots, { cx: 0, cy: size / 2, n }), sweep: false, n };
  });
}

export function WorkspaceDotIcon({
  icon,
  size,
  motion,
  className,
}: {
  icon: WorkspaceDotIconName;
  size: number;
  motion: WorkspaceDotIconMotion;
  className?: string;
}) {
  const art = build(icon, size, motion);
  return (
    <DotMatrixMotion width={size} height={size} origin={[0, 50]} className={className}>
      {art.sweep ? (
        <DotGroup enter={0}>
          {art.rings.map(({ index, dots }) => (
            <DotGroup key={index} dots={dots} enter={false} loop="flow" period={SWEEP_PERIOD} delay={1.5 + index * 0.3} />
          ))}
        </DotGroup>
      ) : (
        art.rings.map(({ index, dots }) => (
          <DotGroup
            key={index}
            dots={dots}
            enter={index}
            loop="ripple"
            period={DOT_MOTION.period.ripple}
            delay={rippleDelay(index, art.n ?? 3)}
          />
        ))
      )}
    </DotMatrixMotion>
  );
}
