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

export const CORE_DECOR_PRESETS: Partial<Record<DotDecorPreset, DecorItem[]>> = {
  // 01 书本：右上大弧 + 左下栅格碎片 + 左上散点星
  page: [
    {
      at: tr,
      node: (
        <CornerArc position={tr} size={168} radius={140} gap={7} max={0.2} />
      ),
    },
    {
      at: bl,
      node: (
        <DecorShard
          position={bl}
          cols={8}
          rows={5}
          pitch={9}
          max={0.2}
          inset={24}
        />
      ),
    },
    {
      at: tl,
      minor: true,
      node: (
        <DecorScatter
          position={tl}
          seed={7}
          width={150}
          height={96}
          accent
          inset={[36, 28]}
        />
      ),
    },
  ],
  // 02 空文件夹：左上渐隐三角 + 右下横向刻度
  folder: [
    {
      at: tl,
      node: <CornerTriangle position={tl} size={96} pitch={9} max={0.18} />,
    },
    {
      at: br,
      node: <DecorTicks position={br} axis="x" length={144} inset={[20, 14]} />,
    },
  ],
  // 10 大纲：右上十字准星 + 左下纵向刻度 + 右下散点星
  outline: [
    {
      at: tr,
      node: (
        <CornerCrosshair
          position={tr}
          size={48}
          arm={12}
          max={0.24}
          className="right-2 top-2"
        />
      ),
    },
    {
      at: bl,
      node: (
        <DecorTicks
          position={bl}
          axis="y"
          length={108}
          inset={[10, 28]}
          max={0.2}
        />
      ),
    },
    {
      at: br,
      minor: true,
      node: (
        <DecorScatter
          position={br}
          seed={23}
          width={96}
          height={72}
          count={6}
          inset={[14, 40]}
        />
      ),
    },
  ],
  // 08 搜索：左下渐隐三角 + 右上散点星
  search: [
    {
      at: bl,
      node: <CornerTriangle position={bl} size={84} pitch={8} max={0.18} />,
    },
    {
      at: tr,
      node: (
        <DecorScatter
          position={tr}
          seed={5}
          width={120}
          height={72}
          count={7}
          inset={[20, 12]}
        />
      ),
    },
  ],
  // 09 历史：右上十字准星 + 左下纵向刻度 + 右下四分之一弧
  history: [
    {
      at: tr,
      node: (
        <CornerCrosshair
          position={tr}
          size={56}
          arm={14}
          className="right-4 top-4"
        />
      ),
    },
    {
      at: bl,
      node: <DecorTicks position={bl} axis="y" length={132} inset={[16, 24]} />,
    },
    {
      at: br,
      minor: true,
      node: (
        <CornerArc position={br} size={120} radius={100} gap={7} max={0.18} />
      ),
    },
  ],
  // 17 分栏不存在：左上栅格碎片 + 右下十字准星
  splitMissing: [
    {
      at: tl,
      node: <DecorShard position={tl} cols={6} rows={5} pitch={8} inset={18} />,
    },
    {
      at: br,
      node: (
        <CornerCrosshair
          position={br}
          size={52}
          arm={13}
          className="bottom-3 right-3"
        />
      ),
    },
  ],
  // 16 渲染失败：右上横向刻度 + 左下四分之一弧 + 右下散点
  splitError: [
    {
      at: tr,
      node: <DecorTicks position={tr} axis="x" length={120} inset={[24, 12]} />,
    },
    {
      at: bl,
      node: (
        <CornerArc position={bl} size={104} radius={84} gap={6} max={0.2} />
      ),
    },
    {
      at: br,
      minor: true,
      node: (
        <DecorScatter
          position={br}
          seed={19}
          width={110}
          height={70}
          count={6}
          inset={[24, 18]}
        />
      ),
    },
  ],
};
