import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";
import { halo, ringBuckets } from "../geometry";
import { DOT_MOTION, rippleDelay } from "../motion";
import { columnBins } from "./settingsDotIcons";
import { workspaceDotIcon } from "./workspaceDotIcons";

const W = 196;
const H = 124;
const SIZE = 76;
const RINGS = 8;
const COLUMNS = 10;
const SWEEP_PERIOD = 12;

function build() {
  const { dots, hit } = workspaceDotIcon("folderOpen", SIZE, (W - SIZE) / 2, (H - SIZE) / 2);
  const haloDots = halo(W, H, W / 2, H / 2, Math.min(W * 0.62, H * 0.9), { skip: hit, pitch: 6, max: 0.15 });
  return {
    halo: ringBuckets(haloDots, { cx: W / 2, cy: H / 2, n: RINGS }),
    columns: columnBins(dots, COLUMNS),
  };
}

const ART = build();
const RIPPLE = DOT_MOTION.period.ripple;

/** 02 空文件夹主页：打开的文件夹 + 光晕。光晕波纹外扩；文件夹一束光自左向右缓慢扫过。 */
export function FolderEmptyArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={W} height={H} className={className}>
      {ART.halo.map(({ index, dots }) => (
        <DotGroup key={index} dots={dots} enter={index} loop="ripple" period={RIPPLE} delay={rippleDelay(index, RINGS)} />
      ))}
      <DotGroup enter={0}>
        {ART.columns.map(({ index, dots }) => (
          <DotGroup key={index} dots={dots} enter={false} loop="flow" period={SWEEP_PERIOD} delay={1.5 + index * 0.3} />
        ))}
      </DotGroup>
    </DotMatrixMotion>
  );
}
