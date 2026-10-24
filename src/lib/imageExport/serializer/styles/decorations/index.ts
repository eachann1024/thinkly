import type { CardTheme } from "../../../themes";
import { buildDecorationLayers, composeBackground } from "./layers";
import { buildPseudoRules } from "./pseudo";
import { buildTypeRules, type TypeSelectors } from "./typography";

export interface DecorationSelectors extends TypeSelectors {
  container: string;
  card: string;
}

export const EXPORT_DECORATION_SELECTORS: DecorationSelectors = {
  container: ".gooseshot-container",
  card: ".gooseshot-card",
  header: ".gooseshot-header",
  title: ".gooseshot-title",
  content: ".gooseshot-content",
  watermark: ".gooseshot-watermark",
  date: ".gooseshot-watermark-date",
};

export interface DecorationStyles {
  css: string;
  containerBackground: string;
  cardBackground: string;
}

function scaler(scale: number): (value: number) => string {
  return (value) => `${Math.round(value * scale * 100) / 100 || 0}px`;
}

export function buildDecorationStyles(
  t: CardTheme,
  selectors: DecorationSelectors = EXPORT_DECORATION_SELECTORS,
  scale = 1,
): DecorationStyles {
  const px = scaler(scale);
  const layers = buildDecorationLayers(t, px);
  return {
    css: buildPseudoRules(t, selectors, px) + buildTypeRules(t, selectors, px),
    containerBackground: composeBackground(layers.container, t.background),
    cardBackground: composeBackground(layers.card, t.cardBg),
  };
}

export function buildDecorationCss(t: CardTheme): string {
  if (!t.decorations?.length) return "";
  const styles = buildDecorationStyles(t);
  const sel = EXPORT_DECORATION_SELECTORS;
  return `${sel.container} { background: ${styles.containerBackground}; }
${sel.card} { background: ${styles.cardBackground}; }
${styles.css}`;
}
