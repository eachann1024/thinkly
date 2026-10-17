import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/themes/presets/artisticReading.ts#localMessages:1">`
zh-Hans:
  mediumMagazine: "Medium 杂志"
  largeSerifHeadingsForComfortableReading: "衬线大标题，阅读感"
  magazine: "杂志"
  reading: "阅读"
  haraWhite: "原研哉·白"
  generousWhiteSpaceWithAQuietMinimalFeel: "极致留白，东方禅意"
  minimal: "极简"
  design: "设计"
  vintageTypewriter: "复古打字机"
  creamPaperWithALiteraryFeel: "米黄纸张，文学气息"
  vintage: "复古"
  literary: "文学"
  academicLatex: "学术 LaTeX"
  preciseTypesettingInspiredByAcademicPapers: "严谨排版，论文感"
  academic: "学术"
  formal: "严肃"
en:
  mediumMagazine: "Medium Magazine"
  largeSerifHeadingsForComfortableReading: "Large serif headings for comfortable reading"
  magazine: "Magazine"
  reading: "Reading"
  haraWhite: "Hara White"
  generousWhiteSpaceWithAQuietMinimalFeel: "Generous white space with a quiet, minimal feel"
  minimal: "Minimal"
  design: "Design"
  vintageTypewriter: "Vintage Typewriter"
  creamPaperWithALiteraryFeel: "Cream paper with a literary feel"
  vintage: "Vintage"
  literary: "Literary"
  academicLatex: "Academic LaTeX"
  preciseTypesettingInspiredByAcademicPapers: "Precise typesetting inspired by academic papers"
  academic: "Academic"
  formal: "Formal"
`;
const uiText = createTranslator(localMessages);
import { TEXT_COLORS } from "@/lib/textColors";
import type { CardTheme } from "../types";

export const ARTISTIC_READING: CardTheme[] = [
  // ── 3. Medium ────────────────────────────────────────────────
  {
    id: "medium",
    get name() { return uiText("mediumMagazine"); },
    nameEn: "Medium",
    get description() { return uiText("largeSerifHeadingsForComfortableReading"); },
    tags: [uiText("magazine"), uiText("reading")],
    mode: "light",
    titleFont: "'Noto Serif SC', 'Georgia', 'Times New Roman', serif",
    bodyFont: "'Noto Serif SC', 'Georgia', 'Times New Roman', serif",
    codeFont: "'JetBrains Mono', 'SF Mono', monospace",
    titleFontSize: 34,
    titleFontWeight: 400,
    titleLineHeight: 1.2,
    titleLetterSpacing: "-0.01em",
    titleAlign: "center",
    bodyFontSize: 16,
    bodyLineHeight: 1.9,
    bodyLetterSpacing: "0.01em",
    background: "#faf9f6",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#1a8917",
    codeBg: "#f7f7f7",
    quoteBorder: "#e5e5e5",
    calloutBg: "#f9f9f9",
    tableBorder: "#e5e5e5",
    divider: "#e5e5e5",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 64,
    containerPaddingY: 64,
    cardPaddingX: 48,
    cardPaddingY: 48,
    cardRadius: 4,
    cardBorder: "none",
    cardShadow: "0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "masthead-rule", color: TEXT_COLORS.light.primary },
      { kind: "title-ornament", color: TEXT_COLORS.light.secondary },
      { kind: "quote-mark", color: "#1a8917" },
    ],
  },

  // ── 4. Kenya Hara ────────────────────────────────────────────
  {
    id: "kenya-hara",
    get name() { return uiText("haraWhite"); },
    nameEn: "Kenya Hara",
    get description() { return uiText("generousWhiteSpaceWithAQuietMinimalFeel"); },
    tags: [uiText("minimal"), uiText("design")],
    mode: "light",
    titleFont: "'Noto Sans SC', 'Helvetica Neue', sans-serif",
    bodyFont: "'Noto Sans SC', 'Helvetica Neue', sans-serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 20,
    titleFontWeight: 300,
    titleLineHeight: 1.6,
    titleLetterSpacing: "0.15em",
    titleAlign: "left",
    bodyFontSize: 14,
    bodyLineHeight: 2.2,
    bodyLetterSpacing: "0.05em",
    background: "#fefefe",
    cardBg: "transparent",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#888888",
    codeBg: "#f8f8f8",
    quoteBorder: "#dddddd",
    calloutBg: "#fafafa",
    tableBorder: "#eeeeee",
    divider: "#eeeeee",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 80,
    containerPaddingY: 80,
    cardPaddingX: 0,
    cardPaddingY: 0,
    cardRadius: 0,
    cardBorder: "none",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: false,
    decorations: [
      { kind: "grain", target: "container", tone: "#8a8172", opacity: 0.07, fibers: true },
      { kind: "trim-marks", color: "#d4d4d4", inset: 28 },
      { kind: "stamp-seal", color: "#b8432f" },
    ],
  },

  // ── 5. Typewriter ────────────────────────────────────────────
  {
    id: "typewriter",
    get name() { return uiText("vintageTypewriter"); },
    nameEn: "Typewriter",
    get description() { return uiText("creamPaperWithALiteraryFeel"); },
    tags: [uiText("vintage"), uiText("literary")],
    mode: "light",
    titleFont: "'Courier Prime', 'Noto Serif SC', 'Songti SC', serif",
    bodyFont: "'Courier Prime', 'Noto Serif SC', 'Songti SC', serif",
    codeFont: "'Courier Prime', monospace",
    titleFontSize: 24,
    titleFontWeight: 700,
    titleLineHeight: 1.4,
    titleLetterSpacing: "0.02em",
    titleAlign: "left",
    bodyFontSize: 15,
    bodyLineHeight: 1.85,
    bodyLetterSpacing: "0.01em",
    background: "#f5f0e6",
    cardBg: "#faf6ed",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#8b4513",
    codeBg: "#f0ebe0",
    quoteBorder: "#d4c9b8",
    calloutBg: "#f5f0e4",
    tableBorder: "#d4c9b8",
    divider: "#d4c9b8",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 56,
    containerPaddingY: 56,
    cardPaddingX: 40,
    cardPaddingY: 40,
    cardRadius: 2,
    cardBorder: "1px solid #e8e0d0",
    cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04), inset 0 0 60px rgba(139,69,19,0.02)",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
    decorations: [
      { kind: "ink-bleed", color: "rgba(61,50,37,0.35)" },
      { kind: "grain", target: "card", tone: "#6b5434", opacity: 0.08 },
      { kind: "coffee-ring", color: "#8b5a2b" },
      { kind: "mono-footer", color: "#d4c9b8", dashed: true },
    ],
  },

  // ── 7. Academic ──────────────────────────────────────────────
  {
    id: "academic",
    get name() { return uiText("academicLatex"); },
    nameEn: "Academic",
    get description() { return uiText("preciseTypesettingInspiredByAcademicPapers"); },
    tags: [uiText("academic"), uiText("formal")],
    mode: "light",
    titleFont: "'Noto Serif SC', 'Times New Roman', 'Georgia', serif",
    bodyFont: "'Noto Serif SC', 'Times New Roman', 'Georgia', serif",
    codeFont: "'JetBrains Mono', monospace",
    titleFontSize: 22,
    titleFontWeight: 700,
    titleLineHeight: 1.4,
    titleLetterSpacing: "0",
    titleAlign: "center",
    bodyFontSize: 15,
    bodyLineHeight: 1.75,
    bodyLetterSpacing: "0",
    background: "#ffffff",
    cardBg: "#ffffff",
    textColor: TEXT_COLORS.light.primary,
    secondaryText: TEXT_COLORS.light.secondary,
    accent: "#0066cc",
    codeBg: "#f8f8f8",
    quoteBorder: "#cccccc",
    calloutBg: "#fafafa",
    tableBorder: "#cccccc",
    divider: "#cccccc",
    watermark: TEXT_COLORS.light.secondary,
    containerPaddingX: 64,
    containerPaddingY: 64,
    cardPaddingX: 48,
    cardPaddingY: 40,
    cardRadius: 0,
    cardBorder: "1px solid #e0e0e0",
    cardShadow: "none",
    showDecorations: false,
    decorationColor: "transparent",
    watermarkVisible: true,
  },

];
