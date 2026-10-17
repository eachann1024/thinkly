import type { CardTheme } from "../../../themes";
import type { BackgroundDecoration, CardDecoration } from "../../../themes/decorations";
import {
  CONTRIBUTION_SIZE,
  GRAIN_TILE,
  HORIZON_HEIGHT,
  PALETTE_DOT,
  STAR_TILE,
  coffeeRingSvg,
  contributionSvg,
  grainSvg,
  halftoneSvg,
  horizonSvg,
  paletteDotsSvg,
  starfieldSvg,
  sunSvg,
  svgUrl,
} from "./svg";

export interface DecorationLayers {
  container: string[];
  card: string[];
}

const BACKGROUND_KINDS = new Set<CardDecoration["kind"]>([
  "grain",
  "dot-grid",
  "line-grid",
  "scanlines",
  "halftone-corner",
  "contribution-graph",
  "palette-dots",
  "starfield",
  "coffee-ring",
  "synth-horizon",
  "synth-sun",
  "trim-marks",
  "hazard-hatch",
]);

function isBackground(decoration: CardDecoration): decoration is BackgroundDecoration {
  return BACKGROUND_KINDS.has(decoration.kind);
}

/** 返回 [目标, 若干背景层]；scale 用于选择器缩略预览。 */
function toLayers(
  d: BackgroundDecoration,
  t: CardTheme,
  px: (value: number) => string,
): ["container" | "card", string[]] {
  const padX = t.containerPaddingX;
  const padY = t.containerPaddingY;
  switch (d.kind) {
    case "grain":
      return [d.target, [`${svgUrl(grainSvg(d.tone, d.opacity, d.fibers))} 0 0 / ${px(GRAIN_TILE)} ${px(GRAIN_TILE)} repeat`]];
    case "dot-grid":
      return [d.target, [`radial-gradient(circle, ${d.color} 1.1px, transparent 1.5px) ${px(d.gap / 2)} ${px(d.gap / 2)} / ${px(d.gap)} ${px(d.gap)} repeat`]];
    case "line-grid":
      return [
        d.target,
        [
          `linear-gradient(${d.color} 1px, transparent 1px) ${px(padX)} ${px(padY)} / ${px(d.gap)} ${px(d.gap)} repeat`,
          `linear-gradient(90deg, ${d.color} 1px, transparent 1px) ${px(padX)} ${px(padY)} / ${px(d.gap)} ${px(d.gap)} repeat`,
        ],
      ];
    case "scanlines":
      return [d.target, [`repeating-linear-gradient(0deg, ${d.color} 0 1px, transparent 1px 3px)`]];
    case "halftone-corner":
      return ["container", [`${svgUrl(halftoneSvg(d.color, d.size))} right 0 top 0 / ${px(d.size)} ${px(d.size)} no-repeat`]];
    case "contribution-graph": {
      const { cols, rows, cell, gap } = CONTRIBUTION_SIZE;
      const width = cols * (cell + gap) - gap;
      const height = rows * (cell + gap) - gap;
      const bottom = Math.max((padY - height) / 2, 6);
      return ["container", [`${svgUrl(contributionSvg(d.colors))} right ${px(padX)} bottom ${px(bottom)} / ${px(width)} ${px(height)} no-repeat`]];
    }
    case "palette-dots": {
      const { radius, gap } = PALETTE_DOT;
      const width = d.colors.length * (radius * 2 + gap) - gap;
      const bottom = (padY - radius * 2) / 2;
      return ["container", [`${svgUrl(paletteDotsSvg(d.colors))} left ${px(padX)} bottom ${px(bottom)} / ${px(width)} ${px(radius * 2)} no-repeat`]];
    }
    case "starfield":
      return ["container", [`${svgUrl(starfieldSvg(d.color))} 0 0 / ${px(STAR_TILE)} ${px(STAR_TILE)} repeat`]];
    case "coffee-ring":
      return ["container", [`${svgUrl(coffeeRingSvg(d.color))} right ${px(14)} top ${px(10)} / ${px(140)} ${px(140)} no-repeat`]];
    case "synth-horizon":
      return ["container", [`${svgUrl(horizonSvg(d.color))} center bottom / 100% ${px(HORIZON_HEIGHT)} no-repeat`]];
    case "synth-sun":
      return ["container", [`${svgUrl(sunSvg(d.color))} right ${px(padX + 36)} top ${px(padY - 58)} / ${px(132)} ${px(132)} no-repeat`]];
    case "trim-marks": {
      const o = px(d.inset);
      const len = px(16);
      const line = `linear-gradient(${d.color}, ${d.color})`;
      const corners = [
        ["left", "top"],
        ["right", "top"],
        ["left", "bottom"],
        ["right", "bottom"],
      ];
      return [
        "container",
        corners.flatMap(([x, y]) => [
          `${line} ${x} ${o} ${y} ${o} / ${len} 1px no-repeat`,
          `${line} ${x} ${o} ${y} ${o} / 1px ${len} no-repeat`,
        ]),
      ];
    }
    case "hazard-hatch": {
      const height = 16;
      const bottom = Math.max((padY - height) / 2, 6);
      return [
        "container",
        [`repeating-linear-gradient(-45deg, ${d.color} 0 ${px(6)}, transparent ${px(6)} ${px(12)}) left ${px(padX)} bottom ${px(bottom)} / ${px(148)} ${px(height)} no-repeat`],
      ];
    }
  }
}

export function buildDecorationLayers(
  t: CardTheme,
  px: (value: number) => string,
): DecorationLayers {
  const layers: DecorationLayers = { container: [], card: [] };
  for (const decoration of t.decorations ?? []) {
    if (!isBackground(decoration)) continue;
    const [target, list] = toLayers(decoration, t, px);
    layers[target].push(...list);
  }
  return layers;
}

/** 背景层在上，主题原有底色 / 渐变垫底。 */
export function composeBackground(layers: string[], base: string): string {
  return layers.length > 0 ? [...layers, base].join(", ") : base;
}
