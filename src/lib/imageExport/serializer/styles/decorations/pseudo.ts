import type { CardTheme } from "../../../themes";
import type { CardDecoration, PseudoDecoration } from "../../../themes/decorations";
import { plusSvg, svgUrl } from "./svg";

export type PseudoSlot = "card::before" | "card::after" | "container::after";

const SLOT_BY_KIND: Record<PseudoDecoration["kind"], PseudoSlot> = {
  "washi-tape": "card::before",
  "bookmark-ribbon": "card::before",
  "edge-tab": "card::before",
  "offset-plate": "card::before",
  "palette-strip": "card::before",
  "masthead-rule": "card::before",
  "crosshair-corners": "card::after",
  "stitched-border": "card::after",
  "wax-seal": "card::after",
  "stamp-seal": "container::after",
};

function isPseudo(decoration: CardDecoration): decoration is PseudoDecoration {
  return decoration.kind in SLOT_BY_KIND;
}

function borderWidth(border: string): number {
  if (border.trim() === "none") return 0;
  const match = /(\d+(?:\.\d+)?)px/.exec(border);
  return match ? Number(match[1]) : 0;
}

function hardStops(colors: string[]): string {
  const step = 100 / colors.length;
  return colors
    .map((color, index) => `${color} ${(index * step).toFixed(2)}% ${((index + 1) * step).toFixed(2)}%`)
    .join(", ");
}

function declarations(
  d: PseudoDecoration,
  t: CardTheme,
  px: (value: number) => string,
): string {
  const edge = borderWidth(t.cardBorder);
  switch (d.kind) {
    case "washi-tape": {
      const notch = px(4);
      const zigzag = `0 0, ${notch} 18%, 0 36%, ${notch} 54%, 0 72%, ${notch} 88%, 0 100%, 100% 100%, calc(100% - ${notch}) 84%, 100% 66%, calc(100% - ${notch}) 48%, 100% 30%, calc(100% - ${notch}) 14%, 100% 0`;
      return `top: ${px(-14)}; left: 50%; width: ${px(118)}; height: ${px(28)};
  transform: translateX(-50%) rotate(${d.angle}deg);
  background: repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 ${px(5)}, transparent ${px(5)} ${px(11)}), ${d.color};
  clip-path: polygon(${zigzag});`;
    }
    case "bookmark-ribbon":
      return `top: ${px(-edge)}; right: ${px(18)}; width: ${px(14)}; height: ${px(46)};
  background: ${d.color};
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - ${px(7)}), 0 100%);`;
    case "edge-tab":
      return `top: ${px(-(14 + edge))}; left: ${px(28)}; width: ${px(64)}; height: ${px(14)};
  background: ${d.color};
  border: ${px(Math.max(edge, 1))} solid ${d.ink}; border-bottom: none;`;
    case "offset-plate": {
      const o = px(d.offset);
      return `top: calc(${o} - ${px(edge)}); left: calc(${o} - ${px(edge)}); right: calc(-${o} - ${px(edge)}); bottom: calc(-${o} - ${px(edge)});
  border-radius: ${px(t.cardRadius)};
  background: radial-gradient(circle, ${d.color} ${px(1.15)}, transparent ${px(1.5)}) 0 0 / ${px(4)} ${px(4)} repeat, ${d.tint};
  clip-path: polygon(calc(100% - ${o}) 0, 100% 0, 100% 100%, 0 100%, 0 calc(100% - ${o}), calc(100% - ${o}) calc(100% - ${o}));`;
    }
    case "palette-strip": {
      const inset = px(Math.max(t.cardRadius, 12));
      return `top: ${px(-edge)}; left: ${inset}; right: ${inset}; height: ${px(2)};
  background: linear-gradient(90deg, ${hardStops(d.colors)});`;
    }
    case "masthead-rule":
      return `top: ${px(20)}; left: ${px(t.cardPaddingX)}; right: ${px(t.cardPaddingX)}; height: ${px(5)};
  border-top: 2px solid ${d.color}; border-bottom: 1px solid ${d.color};`;
    case "crosshair-corners": {
      const reach = px(7.5 + edge);
      const plus = svgUrl(plusSvg(d.color));
      const size = `${px(15)} ${px(15)} no-repeat`;
      return `top: -${reach}; left: -${reach}; right: -${reach}; bottom: -${reach};
  background: ${plus} left top / ${size}, ${plus} right top / ${size}, ${plus} left bottom / ${size}, ${plus} right bottom / ${size};`;
    }
    case "stitched-border":
      return `top: ${px(8)}; left: ${px(8)}; right: ${px(8)}; bottom: ${px(8)};
  border: 1px dashed ${d.color};
  border-radius: ${px(Math.max(t.cardRadius - 8, 4))};`;
    case "wax-seal":
      return `right: ${px(36)}; bottom: ${px(-18)}; width: ${px(36)}; height: ${px(36)};
  background: ${d.color};
  border-radius: 48% 52% 50% 50% / 52% 48% 52% 48%;
  box-shadow: inset 0 0 0 ${px(5)} ${d.color}, inset 0 0 0 ${px(6)} rgba(255,255,255,0.32), 0 1px 1px rgba(60,30,20,0.16);`;
    case "stamp-seal":
      return `right: ${px(34)}; bottom: ${px(34)}; width: ${px(13)}; height: ${px(13)};
  background: ${d.color};
  box-shadow: inset 0 0 0 ${px(2)} ${d.color}, inset 0 0 0 ${px(2.8)} rgba(255,255,255,0.7);`;
  }
}

export function buildPseudoRules(
  t: CardTheme,
  selectors: { container: string; card: string },
  px: (value: number) => string,
): string {
  const bySlot = new Map<PseudoSlot, string>();
  for (const decoration of t.decorations ?? []) {
    if (!isPseudo(decoration)) continue;
    bySlot.set(SLOT_BY_KIND[decoration.kind], declarations(decoration, t, px));
  }
  let css = "";
  for (const [slot, body] of bySlot) {
    const [owner, pseudo] = slot.split("::") as ["card" | "container", string];
    css += `${selectors[owner]}::${pseudo} {
  content: '';
  position: absolute;
  pointer-events: none;
  ${body}
}
`;
  }
  return css;
}
