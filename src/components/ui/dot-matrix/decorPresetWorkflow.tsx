import {
  CornerArc,
  CornerCrosshair,
  CornerTriangle,
} from "./corners";
import { DecorScatter, DecorShard, DecorTicks } from "./decorShapes";
import type { DecorItem, DotDecorPreset } from "./decorTypes";

const tl = "top-left";
const tr = "top-right";
const bl = "bottom-left";
const br = "bottom-right";

export const WORKFLOW_DECOR_PRESETS: Partial<Record<DotDecorPreset, DecorItem[]>> = {
  // 04 AI 新会话：左上渐隐三角 + 右上纵向刻度
  aiChat: [
    {
      at: tl,
      node: <CornerTriangle position={tl} size={64} pitch={8} max={0.2} />,
    },
    {
      at: tr,
      minor: true,
      node: (
        <DecorTicks
          position={tr}
          axis="y"
          length={96}
          inset={[8, 18]}
          max={0.18}
        />
      ),
    },
  ],
  // 06 AI 不可用：右上栅格碎片 + 左下四分之一弧
  aiOff: [
    {
      at: tr,
      node: <DecorShard position={tr} cols={6} rows={4} pitch={8} inset={16} />,
    },
    {
      at: bl,
      node: (
        <CornerArc position={bl} size={112} radius={92} gap={6} max={0.2} />
      ),
    },
  ],
  // 05 AI 启用：左上渐隐三角 + 右下双弧 + 右上散点星
  aiGate: [
    { at: tl, node: <CornerTriangle position={tl} size={120} max={0.2} /> },
    {
      at: br,
      node: <CornerArc position={br} size={132} radius={112} max={0.2} />,
    },
    {
      at: br,
      node: (
        <CornerArc position={br} size={88} radius={68} gap={7} max={0.14} />
      ),
    },
    {
      at: tr,
      minor: true,
      node: (
        <DecorScatter
          position={tr}
          seed={31}
          width={120}
          height={80}
          count={7}
          accent
          inset={[28, 22]}
        />
      ),
    },
  ],
  // 14 Git 启用：右上十字准星 + 左下渐隐三角 + 右下横向刻度
  gitGate: [
    {
      at: tr,
      node: (
        <CornerCrosshair
          position={tr}
          size={60}
          arm={16}
          max={0.26}
          className="right-3 top-3"
        />
      ),
    },
    {
      at: bl,
      node: <CornerTriangle position={bl} size={116} pitch={10} max={0.2} />,
    },
    {
      at: br,
      minor: true,
      node: <DecorTicks position={br} axis="x" length={132} inset={[22, 16]} />,
    },
  ],
  // 13 WebDAV：左上十字准星 + 右下横向刻度
  webdav: [
    {
      at: tl,
      node: (
        <CornerCrosshair
          position={tl}
          size={44}
          arm={11}
          max={0.24}
          className="left-1.5 top-1.5"
        />
      ),
    },
    {
      at: br,
      node: (
        <DecorTicks
          position={br}
          axis="x"
          length={96}
          inset={[14, 10]}
          max={0.2}
        />
      ),
    },
  ],
  // 15 Git 仓库空：右上渐隐三角 + 左下散点星
  gitRepos: [
    {
      at: tr,
      node: <CornerTriangle position={tr} size={64} pitch={8} max={0.18} />,
    },
    {
      at: bl,
      node: (
        <DecorScatter
          position={bl}
          seed={13}
          width={96}
          height={56}
          count={6}
          inset={[12, 8]}
        />
      ),
    },
  ],
};
