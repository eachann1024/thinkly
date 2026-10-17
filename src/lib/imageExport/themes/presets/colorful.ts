import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/colorful.ts#localMessages:1">`
zh-Hans:
  boldPoster: "海报大字报"
  highImpactDesignForShortText: "冲击力强，短内容"
  poster: "海报"
  impact: "冲击"
  synthwave: "蒸汽合成"
  retroCyberpunkWithNeonColors: "复古赛博朋克，霓虹回潮"
  dark: "深色"
  vintage: "复古"
  solarizedLight: "Solarized 浅"
  classicMutedColorsOnACalmCreamBackground: "经典护眼配色，米黄沉静"
  light: "浅色"
  classic: "经典"
en:
  boldPoster: "Bold Poster"
  highImpactDesignForShortText: "High-impact design for short text"
  poster: "Poster"
  impact: "Impact"
  synthwave: "Synthwave"
  retroCyberpunkWithNeonColors: "Retro cyberpunk with neon colors"
  dark: "Dark"
  vintage: "Vintage"
  solarizedLight: "Solarized Light"
  classicMutedColorsOnACalmCreamBackground: "Classic, muted colors on a calm cream background"
  light: "Light"
  classic: "Classic"
ja:
  boldPoster: "ボールドポスター"
  highImpactDesignForShortText: "短い文章向けのインパクトのあるデザイン"
  poster: "ポスター"
  impact: "インパクト"
  synthwave: "シンセウェーブ"
  retroCyberpunkWithNeonColors: "ネオンカラーのレトロサイバーパンク"
  dark: "ダーク"
  vintage: "ヴィンテージ"
  solarizedLight: "Solarized ライト"
  classicMutedColorsOnACalmCreamBackground: "落ち着いたクリーム色の背景に合う、定番の穏やかな配色"
  light: "ライト"
  classic: "クラシック"
`;
const uiText = createTranslator(localMessages);
import { TEXT_COLORS } from "@/lib/textColors";
import type { CardTheme } from "../types";

export const COLORFUL_THEMES: CardTheme[] = [
  // ── 9. Poster ────────────────────────────────────────────────
  {
    id: "poster",
    get name() { return uiText("boldPoster"); },
    nameEn: "Poster",
    get description() { return uiText("highImpactDesignForShortText"); },
    tags: [uiText("poster"), uiText("impact")],
    mode: "dark",
    titleFont: "'Inter', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 42,
    titleFontWeight: 900,
    titleLineHeight: 1.1,
    titleLetterSpacing: "-0.03em",
    titleAlign: "center",
    bodyFontSize: 16,
    bodyLineHeight: 1.7,
    bodyLetterSpacing: "0",
    background: "#121a2c",
    cardBg: "transparent",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#00d9ff",
    codeBg: "rgba(255,255,255,0.08)",
    quoteBorder: "rgba(255,255,255,0.2)",
    calloutBg: "rgba(255,255,255,0.05)",
    tableBorder: "rgba(255,255,255,0.15)",
    divider: "rgba(255,255,255,0.15)",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 40,
    cardRadius: 0,
    cardBorder: "none",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "rgba(0,217,255,0.1)",
    watermarkVisible: true,
    decorations: [
      { kind: "halftone-corner", color: "rgba(0,217,255,0.16)", size: 260 },
      { kind: "grain", target: "container", tone: "#ffffff", opacity: 0.05 },
      { kind: "title-rule", color: "#00d9ff", thickness: 5, width: 56, gap: 18 },
    ],
  },

  // ── 15. Synthwave ────────────────────────────────────────────
  {
    id: "synthwave",
    get name() { return uiText("synthwave"); },
    nameEn: "Synthwave",
    get description() { return uiText("retroCyberpunkWithNeonColors"); },
    tags: [uiText("dark"), uiText("vintage")],
    mode: "dark",
    titleFont: "'Space Grotesk', 'Inter', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 32,
    titleFontWeight: 700,
    titleLineHeight: 1.15,
    titleLetterSpacing: "-0.02em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.75,
    bodyLetterSpacing: "0",
    background: "#170a2e",
    cardBg: "#1c0d38",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#ff2a6d",
    codeBg: "rgba(0,0,0,0.4)",
    quoteBorder: "#ff2a6d",
    calloutBg: "rgba(255,42,109,0.08)",
    tableBorder: "rgba(255,255,255,0.12)",
    divider: "rgba(255,255,255,0.08)",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 42,
    cardPaddingY: 40,
    cardRadius: 18,
    cardBorder: "1px solid rgba(255,42,109,0.25)",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "rgba(0,217,255,0.12)",
    watermarkVisible: true,
    decorations: [
      { kind: "synth-horizon", color: "rgba(255,42,109,0.32)" },
      { kind: "synth-sun", color: "rgba(255,92,120,0.5)" },
      { kind: "scanlines", target: "card", color: "rgba(255,255,255,0.025)" },
    ],
  },

  // ── 18. Solarized Light ──────────────────────────────────────
  {
    id: "solarized-light",
    get name() { return uiText("solarizedLight"); },
    nameEn: "Solarized",
    get description() { return uiText("classicMutedColorsOnACalmCreamBackground"); },
    tags: [uiText("light"), uiText("classic")],
    mode: "light",
    titleFont: "'Inter', 'IBM Plex Sans', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    titleFontSize: 27,
    titleFontWeight: 600,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.75,
    bodyLetterSpacing: "0",
    background: "#fdf6e3",
    cardBg: "#fdf6e3",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#268bd2",
    codeBg: "#eee8d5",
    quoteBorder: "#93a1a1",
    calloutBg: "#eee8d5",
    tableBorder: "#d8d2bf",
    divider: "#eee8d5",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 38,
    cardRadius: 8,
    cardBorder: "1px solid #eee8d5",
    cardShadow: "0 1px 3px rgba(88,110,117,0.06), 0 4px 16px rgba(88,110,117,0.04)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },
];
