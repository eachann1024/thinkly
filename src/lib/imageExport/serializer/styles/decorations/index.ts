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
  /** 伪元素与文字类装饰规则 */
  css: string;
  /** 合成后的背景简写（装饰层 + 主题底色） */
  containerBackground: string;
  cardBackground: string;
}

function scaler(scale: number): (value: number) => string {
  return (value) => `${Math.round(value * scale * 100) / 100 || 0}px`;
}

/**
 * 生成主题装饰。导出与实时预览共用同一份 CSS；scale 仅供主题选择器缩略卡使用。
 * 装饰只依赖样式表，不新增 DOM，切换主题时预览框替换样式即可生效。
 */
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
