import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/artisticExpressive.ts#localMessages:1">`
zh-Hans:
  journalNotes: "手账便签"
  warmHandwritingWithAPersonalTouch: "温暖手写，生活气息"
  handwritten: "手写"
  cozy: "温馨"
  mochaMousse: "摩卡慕斯"
  warmEarthyBrownsInspiredByTheColorOfThe: "暖棕大地色，2025 年度风"
  light: "浅色"
  warm: "温暖"
  boldPrint: "野性印刷"
  boldTypeSharpEdgesAndSolidShadows: "硬边大字 + 实心投影，叛逆派"
  unconventional: "特立独行"
  risographTextureWithFluorescentInkColors: "孔版印刷，荧光油墨手感"
  print: "印刷"
en:
  journalNotes: "Journal Notes"
  warmHandwritingWithAPersonalTouch: "Warm handwriting with a personal touch"
  handwritten: "Handwritten"
  cozy: "Cozy"
  mochaMousse: "Mocha Mousse"
  warmEarthyBrownsInspiredByTheColorOfThe: "Warm earthy browns inspired by the 2025 color of the year"
  light: "Light"
  warm: "Warm"
  boldPrint: "Bold Print"
  boldTypeSharpEdgesAndSolidShadows: "Bold type, sharp edges, and solid shadows"
  unconventional: "Unconventional"
  risographTextureWithFluorescentInkColors: "Risograph texture with fluorescent ink colors"
  print: "Print"
`;
const uiText = createTranslator(localMessages);
import { TEXT_COLORS } from "@/lib/textColors";
import type { CardTheme } from "../types";

export const ARTISTIC_EXPRESSIVE: CardTheme[] = [
  // ── 8. Stationery ────────────────────────────────────────────
  {
    id: "stationery",
    get name() { return uiText("journalNotes"); },
    nameEn: "Stationery",
    get description() { return uiText("warmHandwritingWithAPersonalTouch"); },
    tags: [uiText("handwritten"), uiText("cozy")],
    mode: "light",
    titleFont: "'Ma Shan Zheng', 'ZCOOL XiaoWei', 'Noto Sans SC', 'PingFang SC', sans-serif",
    bodyFont: "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 26,
    titleFontWeight: 400,
    titleLineHeight: 1.4,
    titleLetterSpacing: "0.04em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.85,
    bodyLetterSpacing: "0.02em",
    background: "#fef9e7",
    cardBg: "#fffef5",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#d97706",
    codeBg: "#faf5e6",
    quoteBorder: "#e8dcc8",
    calloutBg: "#fdf8ed",
    tableBorder: "#e8dcc8",
    divider: "#e8dcc8",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 52,
    containerPaddingY: 52,
    cardPaddingX: 36,
    cardPaddingY: 36,
    cardRadius: 12,
    cardBorder: "1px solid #f0e8d0",
    cardShadow: "0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "washi-tape", color: "rgba(252,196,57,0.55)", angle: -2 },
      { kind: "dot-grid", target: "card", color: "rgba(180,140,70,0.18)", gap: 18 },
      { kind: "pen-underline", color: "#d97706" },
    ],
  },

  // ── 17. Mocha Mousse (Pantone-inspired) ──────────────────────
  {
    id: "mocha-mousse",
    get name() { return uiText("mochaMousse"); },
    nameEn: "Mocha Mousse",
    get description() { return uiText("warmEarthyBrownsInspiredByTheColorOfThe"); },
    tags: [uiText("light"), uiText("warm")],
    mode: "light",
    titleFont: "'Fraunces', 'Noto Serif SC', Georgia, serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 30,
    titleFontWeight: 500,
    titleLineHeight: 1.25,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.8,
    bodyLetterSpacing: "0.005em",
    background: "#f5ede0",
    cardBg: "#fdf8ee",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#a47864",
    codeBg: "#ede3d3",
    quoteBorder: "#c9b8a3",
    calloutBg: "#f5ede0",
    tableBorder: "#d8c8b3",
    divider: "#e5d8c4",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 60,
    containerPaddingY: 60,
    cardPaddingX: 44,
    cardPaddingY: 42,
    cardRadius: 18,
    cardBorder: "none",
    cardShadow: "0 4px 24px rgba(164,120,100,0.1), 0 1px 2px rgba(164,120,100,0.06)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "letterpress", highlight: "rgba(255,255,255,0.75)" },
      { kind: "grain", target: "card", tone: "#7a5a44", opacity: 0.06 },
      { kind: "wax-seal", color: "#a47864" },
    ],
  },

  // ── 19. Brutalist ────────────────────────────────────────────
  {
    id: "brutalist",
    get name() { return uiText("boldPrint"); },
    nameEn: "Brutalist",
    get description() { return uiText("boldTypeSharpEdgesAndSolidShadows"); },
    tags: [uiText("light"), uiText("unconventional")],
    mode: "light",
    titleFont: "'Space Grotesk', 'Inter', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 42,
    titleFontWeight: 700,
    titleLineHeight: 1.02,
    titleLetterSpacing: "-0.04em",
    titleAlign: "left",
    bodyFontSize: 16,
    bodyLineHeight: 1.6,
    bodyLetterSpacing: "0",
    background: "#f5f5f5",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#ff5500",
    codeBg: "#0a0a0a",
    codeTextColor: TEXT_COLORS.dark.primary,
    quoteBorder: "#0a0a0a",
    calloutBg: "#ffe4d6",
    tableBorder: "#0a0a0a",
    divider: "#0a0a0a",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 38,
    cardRadius: 0,
    cardBorder: "2px solid #0a0a0a",
    cardShadow: "6px 6px 0 #0a0a0a",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "edge-tab", color: "#ff5500", ink: "#0a0a0a" },
      { kind: "title-rule", color: "#0a0a0a", thickness: 4, gap: 14 },
      { kind: "hazard-hatch", color: "#0a0a0a" },
    ],
  },

  // ── 20. Risograph ────────────────────────────────────────────
  {
    id: "risograph",
    name: "Risograph",
    nameEn: "Risograph",
    get description() { return uiText("risographTextureWithFluorescentInkColors"); },
    tags: [uiText("light"), uiText("print")],
    mode: "light",
    titleFont: "'Fraunces', 'Noto Serif SC', Georgia, serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 28,
    titleFontWeight: 600,
    titleLineHeight: 1.25,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.8,
    bodyLetterSpacing: "0.005em",
    background: "#faf5ec",
    cardBg: "#fffaf0",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#f06f6f",
    codeBg: "#f5ede0",
    quoteBorder: "#d4c5a8",
    calloutBg: "#fdf2e0",
    tableBorder: "#d4c5a8",
    divider: "#e5d8c4",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 42,
    cardPaddingY: 40,
    cardRadius: 4,
    cardBorder: "1px solid #d4c5a8",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "misregistration", color: "rgba(240,111,111,0.45)" },
      { kind: "offset-plate", color: "rgba(240,111,111,0.55)", tint: "rgba(240,111,111,0.1)", offset: 8 },
      { kind: "grain", target: "container", tone: "#7a5c3c", opacity: 0.07 },
      { kind: "quote-rule", color: "#f06f6f", width: 1.5 },
      { kind: "mono-footer", color: "#f0b4ac" },
    ],
  },
];
