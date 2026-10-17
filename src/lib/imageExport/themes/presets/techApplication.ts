import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/techApplication.ts#localMessages:1">`
zh-Hans:
  vercelBlack: "Vercel 极黑"
  minimalBlackWithAModernEdge: "纯黑极简，硬核现代"
  dark: "深色"
  minimal: "极简"
  tokyoNight: "东京之夜"
  deepBluesAndPurplesInspiredByAClassicEditor: "深蓝紫调，编辑器经典"
  code: "代码"
  aDarkThemeWithSoftPinkAccents: "柔和粉调暗色，开发者最爱"
  soft: "柔和"
  coolGeometricStylingWithATechnicalFeel: "几何冷感，工程师审美"
  light: "浅色"
  geometric: "几何"
en:
  vercelBlack: "Vercel Black"
  minimalBlackWithAModernEdge: "Minimal black with a modern edge"
  dark: "Dark"
  minimal: "Minimal"
  tokyoNight: "Tokyo Night"
  deepBluesAndPurplesInspiredByAClassicEditor: "Deep blues and purples inspired by a classic editor theme"
  code: "Code"
  aDarkThemeWithSoftPinkAccents: "A dark theme with soft pink accents"
  soft: "Soft"
  coolGeometricStylingWithATechnicalFeel: "Cool geometric styling with a technical feel"
  light: "Light"
  geometric: "Geometric"
`;
const uiText = createTranslator(localMessages);
import { TEXT_COLORS } from "@/lib/textColors";
import type { CardTheme } from "../types";

export const TECH_APPLICATION: CardTheme[] = [
  // ── 12. Vercel Geist ─────────────────────────────────────────
  {
    id: "vercel-dark",
    name: uiText("vercelBlack"),
    nameEn: "Vercel Geist",
    description: uiText("minimalBlackWithAModernEdge"),
    tags: [uiText("dark"), uiText("minimal")],
    mode: "dark",
    titleFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', monospace",
    titleFontSize: 34,
    titleFontWeight: 600,
    titleLineHeight: 1.15,
    titleLetterSpacing: "-0.03em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.7,
    bodyLetterSpacing: "-0.005em",
    background: "#0a0a0a",
    cardBg: "#0a0a0a",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#ffffff",
    codeBg: "#171717",
    quoteBorder: "#262626",
    calloutBg: "#141414",
    tableBorder: "#262626",
    divider: "#1f1f1f",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 64,
    containerPaddingY: 64,
    cardPaddingX: 44,
    cardPaddingY: 44,
    cardRadius: 0,
    cardBorder: "1px solid #262626",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },

  // ── 13. Tokyo Night ──────────────────────────────────────────
  {
    id: "tokyo-night",
    name: uiText("tokyoNight"),
    nameEn: "Tokyo Night",
    description: uiText("deepBluesAndPurplesInspiredByAClassicEditor"),
    tags: [uiText("dark"), uiText("code")],
    mode: "dark",
    titleFont: "'Inter', 'JetBrains Mono', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', monospace",
    titleFontSize: 28,
    titleFontWeight: 600,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.75,
    bodyLetterSpacing: "0",
    background: "linear-gradient(155deg, #1a1b26 0%, #1f2335 100%)",
    cardBg: "#24283b",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#7aa2f7",
    codeBg: "#1f2335",
    quoteBorder: "#414868",
    calloutBg: "#292e42",
    tableBorder: "#414868",
    divider: "#292e42",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 42,
    cardPaddingY: 38,
    cardRadius: 14,
    cardBorder: "1px solid #292e42",
    cardShadow: "0 12px 36px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.02)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },

  // ── 14. Catppuccin Macchiato ─────────────────────────────────
  {
    id: "catppuccin",
    name: "Catppuccin",
    nameEn: "Macchiato",
    description: uiText("aDarkThemeWithSoftPinkAccents"),
    tags: [uiText("dark"), uiText("soft")],
    mode: "dark",
    titleFont: "'Inter', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 28,
    titleFontWeight: 600,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.75,
    bodyLetterSpacing: "0",
    background: "#24273a",
    cardBg: "#1e2030",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#c6a0f6",
    codeBg: "#181926",
    quoteBorder: "#494d64",
    calloutBg: "#363a4f",
    tableBorder: "#494d64",
    divider: "#363a4f",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 38,
    cardRadius: 14,
    cardBorder: "1px solid #363a4f",
    cardShadow: "0 10px 30px rgba(0,0,0,0.35)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },

  // ── 16. Linear ───────────────────────────────────────────────
  {
    id: "linear",
    name: "Linear",
    nameEn: "Linear",
    description: uiText("coolGeometricStylingWithATechnicalFeel"),
    tags: [uiText("light"), uiText("geometric")],
    mode: "light",
    titleFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 30,
    titleFontWeight: 600,
    titleLineHeight: 1.2,
    titleLetterSpacing: "-0.025em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.7,
    bodyLetterSpacing: "-0.005em",
    background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#5e6ad2",
    codeBg: "#f7f8fa",
    quoteBorder: "#ebebee",
    calloutBg: "#f7f8fa",
    tableBorder: "#ebebee",
    divider: "#ebebee",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 42,
    cardPaddingY: 40,
    cardRadius: 14,
    cardBorder: "1px solid #ebebee",
    cardShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.04)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },
];
