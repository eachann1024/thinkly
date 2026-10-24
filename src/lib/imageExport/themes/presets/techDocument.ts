import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/techDocument.ts#localMessages:1">`
zh-Hans:
  minimalWhite: "极简白"
  cleanProfessionalDocumentStyling: "极简专业，文档感"
  minimal: "极简"
  document: "文档"
  deepNight: "深邃夜"
  aDarkThemeWithACodeEditorFeel: "深色模式，代码感"
  dark: "深色"
  technical: "技术"
  githubLight: "GitHub 浅"
  githubInspiredLightTheme: "GitHub 官方浅色，开发者友好"
  light: "浅色"
  development: "开发"
  githubDark: "GitHub 深"
  githubInspiredDarkThemeForFocusedReading: "GitHub 官方深色，平静专注"
en:
  minimalWhite: "Minimal White"
  cleanProfessionalDocumentStyling: "Clean, professional document styling"
  minimal: "Minimal"
  document: "Document"
  deepNight: "Deep Night"
  aDarkThemeWithACodeEditorFeel: "A dark theme with a code-editor feel"
  dark: "Dark"
  technical: "Technical"
  githubLight: "GitHub Light"
  githubInspiredLightTheme: "GitHub-inspired light theme"
  light: "Light"
  development: "Development"
  githubDark: "GitHub Dark"
  githubInspiredDarkThemeForFocusedReading: "GitHub-inspired dark theme for focused reading"
ja:
  minimalWhite: "ミニマルホワイト"
  cleanProfessionalDocumentStyling: "すっきりとしたプロフェッショナルなドキュメントスタイル"
  minimal: "ミニマル"
  document: "ドキュメント"
  deepNight: "ディープナイト"
  aDarkThemeWithACodeEditorFeel: "コードエディタのようなダークテーマ"
  dark: "ダーク"
  technical: "テクニカル"
  githubLight: "GitHub ライト"
  githubInspiredLightTheme: "GitHub 風のライトテーマ、開発者向け"
  light: "ライト"
  development: "開発"
  githubDark: "GitHub ダーク"
  githubInspiredDarkThemeForFocusedReading: "GitHub 風のダークテーマ、集中して読むのに最適"
`;
const uiText = createTranslator(localMessages);
import { TEXT_COLORS } from "@/lib/textColors";
import type { CardTheme } from "../types";

export const TECH_DOCUMENT: CardTheme[] = [
  {
    id: "notion",
    get name() { return uiText("minimalWhite"); },
    nameEn: "Minimal White",
    get description() { return uiText("cleanProfessionalDocumentStyling"); },
    tags: [uiText("minimal"), uiText("document")],
    mode: "light",
    titleFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', monospace",
    titleFontSize: 28,
    titleFontWeight: 700,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.02em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.8,
    bodyLetterSpacing: "0",
    background: "#ffffff",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#2d6cdf",
    codeBg: "#f5f5f5",
    quoteBorder: "#e5e7eb",
    calloutBg: "#f9fafb",
    tableBorder: "#e5e7eb",
    divider: "#e5e7eb",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 36,
    cardRadius: 16,
    cardBorder: "1px solid #f0f0f0",
    cardShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },

  {
    id: "obsidian",
    get name() { return uiText("deepNight"); },
    nameEn: "Deep Night",
    get description() { return uiText("aDarkThemeWithACodeEditorFeel"); },
    tags: [uiText("dark"), uiText("technical")],
    mode: "dark",
    titleFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    bodyFont: "'Inter', 'Noto Sans SC', -apple-system, sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', monospace",
    titleFontSize: 26,
    titleFontWeight: 700,
    titleLineHeight: 1.35,
    titleLetterSpacing: "-0.01em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.8,
    bodyLetterSpacing: "0",
    background: "linear-gradient(160deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
    cardBg: "#161b22",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#58a6ff",
    codeBg: "#0d1117",
    quoteBorder: "#30363d",
    calloutBg: "#21262d",
    tableBorder: "#30363d",
    divider: "#30363d",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 36,
    cardRadius: 16,
    cardBorder: "1px solid #30363d",
    cardShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
    showDecorations: true,
    decorationColor: "rgba(88,166,255,0.06)",
    watermarkVisible: true,
  },

  {
    id: "github-light",
    get name() { return uiText("githubLight"); },
    nameEn: "GitHub Light",
    get description() { return uiText("githubInspiredLightTheme"); },
    tags: [uiText("light"), uiText("development")],
    mode: "light",
    titleFont: "'Inter', -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', 'Monaco', monospace",
    titleFontSize: 26,
    titleFontWeight: 600,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.005em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.7,
    bodyLetterSpacing: "0",
    background: "#ffffff",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#0969da",
    codeBg: "#f6f8fa",
    quoteBorder: "#d1d9e0",
    calloutBg: "#f6f8fa",
    tableBorder: "#d1d9e0",
    divider: "#d1d9e0",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 36,
    cardRadius: 12,
    cardBorder: "1px solid #d1d9e0",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "title-rule", color: "#d1d9e0", thickness: 1, gap: 10 },
      { kind: "contribution-graph", colors: ["#eff2f5", "#aceebb", "#4ac26b", "#2da44e", "#116329"] },
    ],
  },

  {
    id: "github-dark",
    get name() { return uiText("githubDark"); },
    nameEn: "GitHub Dark",
    get description() { return uiText("githubInspiredDarkThemeForFocusedReading"); },
    tags: [uiText("dark"), uiText("development")],
    mode: "dark",
    titleFont: "'Inter', -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif",
    bodyFont: "'Inter', -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif",
    codeFont: "'JetBrains Mono', 'SF Mono', 'Monaco', monospace",
    titleFontSize: 26,
    titleFontWeight: 600,
    titleLineHeight: 1.3,
    titleLetterSpacing: "-0.005em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.7,
    bodyLetterSpacing: "0",
    background: "#0d1117",
    cardBg: "#0d1117",
    textColor: TEXT_COLORS.dark.primary,
    secondaryText: TEXT_COLORS.dark.secondary,
    accent: "#2f81f7",
    codeBg: "#161b22",
    quoteBorder: "#30363d",
    calloutBg: "#161b22",
    tableBorder: "#30363d",
    divider: "#21262d",
    watermark: TEXT_COLORS.dark.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 36,
    cardRadius: 12,
    cardBorder: "1px solid #30363d",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "title-rule", color: "#30363d", thickness: 1, gap: 10 },
      { kind: "contribution-graph", colors: ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"] },
    ],
  },

];
