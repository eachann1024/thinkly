import {
  CornerArc,
  CornerCrosshair,
  CornerTriangle,
} from "./corners";
import { DecorScatter, DecorShard, DecorTicks } from "./decorShapes";
import { NoFolderFadeArt, NoFolderScatterArt } from "./illustrations/NoFolderArt";
import type { DecorItem, DotDecorPreset } from "./decorTypes";

const tl = "top-left";
const tr = "top-right";
const bl = "bottom-left";
const br = "bottom-right";

export const WELCOME_DECOR_PRESETS: Partial<Record<DotDecorPreset, DecorItem[]>> = {
  bootstrap: [
    {
      at: tl,
      node: (
        <CornerArc position={tl} size={180} radius={150} gap={7} max={0.18} />
      ),
    },
    {
      at: br,
      node: (
        <DecorShard
          position={br}
          cols={9}
          rows={6}
          pitch={9}
          max={0.2}
          inset={28}
        />
      ),
    },
    {
      at: tr,
      minor: true,
      node: (
        <DecorScatter
          position={tr}
          seed={41}
          width={160}
          height={100}
          count={10}
          accent
          inset={[48, 36]}
        />
      ),
    },
    {
      at: bl,
      minor: true,
      node: (
        <DecorTicks
          position={bl}
          axis="x"
          length={156}
          inset={[32, 22]}
          max={0.18}
        />
      ),
    },
  ],
  noFolder: [
    {
      at: bl,
      node: (
        <NoFolderFadeArt
          motion="corner"
          className="pointer-events-none absolute bottom-0 left-0 text-foreground"
        />
      ),
    },
    {
      at: tr,
      node: (
        <NoFolderScatterArt
          motion="corner"
          className="pointer-events-none absolute right-0 top-0 text-foreground"
        />
      ),
    },
  ],
  character: [
    {
      at: tl,
      node: (
        <CornerArc position={tl} size={156} radius={128} gap={7} max={0.18} />
      ),
    },
    {
      at: tr,
      node: (
        <DecorScatter
          position={tr}
          seed={53}
          width={168}
          height={108}
          count={10}
          accent
          inset={[28, 20]}
        />
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
          max={0.18}
          inset={22}
        />
      ),
    },
    {
      at: br,
      node: (
        <CornerCrosshair
          position={br}
          size={56}
          arm={14}
          max={0.22}
          className="bottom-5 right-5"
        />
      ),
    },
    {
      at: tl,
      minor: true,
      node: (
        <DecorTicks
          position={tl}
          axis="y"
          length={132}
          inset={[14, 176]}
          max={0.16}
        />
      ),
    },
    {
      at: br,
      minor: true,
      node: (
        <DecorTicks
          position={br}
          axis="x"
          length={156}
          inset={[96, 16]}
          max={0.16}
        />
      ),
    },
  ],
};
