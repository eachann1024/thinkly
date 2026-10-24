import jetBrainsMonoUrl from "@/assets/fonts/JetBrainsMono-Regular.ttf?url";

export const PDF_FONT_FAMILY = "NotoSansSC";
export const PDF_DM_MONO_FAMILY = "DM Mono";
export const PDF_JETBRAINS_MONO_FAMILY = "JetBrains Mono";
export const PDF_MONO_FAMILY = "GoosePdfMono";

export type PdfPageFontFamily = "default" | "serif" | "mono";

export type PdfCustomFonts = {
  default: { font: string | null };
  serif: { font: string | null };
  mono: { font: string | null };
};

export type PdfEmbedKind = "noto" | "dm-mono" | "jetbrains-mono";

export type PdfFontPlan = {
  category: PdfPageFontFamily;
  embed: PdfEmbedKind;
  bodyFamily: string;
  pageFontFamily: string | string[];
  bodyUrls: readonly string[];
  bodyFallbackUrls: readonly string[];
  monoFamily: string;
  monoUrls: readonly string[];
};

export const PDF_FONT_RELATIVE_PATHS = [
  "fonts/NotoSansSC-Regular.ttf",
  "fonts/NotoSansSC-Regular.otf",
] as const;

export const PDF_CJK_FONT_URLS = [
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.8/chinese-simplified-400-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.1.0/chinese-simplified-400-normal.ttf",
] as const;

export const PDF_DM_MONO_TTF_URLS = [
  "https://cdn.jsdelivr.net/fontsource/fonts/dm-mono@5.2.6/latin-400-normal.ttf",
  "https://github.com/google/fonts/raw/main/ofl/dmmono/DMMono-Regular.ttf",
] as const;

export const PDF_JETBRAINS_MONO_TTF_URLS = [jetBrainsMonoUrl] as const;

export function firstFamilyName(font: string | null | undefined): string {
  if (!font) return "";
  return font
    .split(",")[0]
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

function classifyCustomName(name: string): PdfEmbedKind | "empty" {
  if (!name) return "empty";
  if (/dm\s*mono/i.test(name)) return "dm-mono";
  if (/jetbrains\s*mono/i.test(name)) return "jetbrains-mono";
  return "noto";
}

function notoPlan(category: PdfPageFontFamily): PdfFontPlan {
  return {
    category,
    embed: "noto",
    bodyFamily: PDF_FONT_FAMILY,
    pageFontFamily: PDF_FONT_FAMILY,
    bodyUrls: PDF_CJK_FONT_URLS,
    bodyFallbackUrls: [],
    monoFamily: PDF_JETBRAINS_MONO_FAMILY,
    monoUrls: PDF_JETBRAINS_MONO_TTF_URLS,
  };
}

export function resolvePdfFontPlan(
  fontFamily?: PdfPageFontFamily | null,
  customFonts?: PdfCustomFonts | null,
): PdfFontPlan {
  const category: PdfPageFontFamily = fontFamily ?? "default";
  const customName = firstFamilyName(customFonts?.[category]?.font);
  const named = classifyCustomName(customName);

  if (named === "dm-mono" || named === "jetbrains-mono" || (named === "empty" && category === "mono")) {
    const useDmMono = named === "dm-mono";
    const monoFamily = useDmMono ? PDF_DM_MONO_FAMILY : PDF_JETBRAINS_MONO_FAMILY;
    return {
      category,
      embed: useDmMono ? "dm-mono" : "jetbrains-mono",
      bodyFamily: PDF_FONT_FAMILY,
      pageFontFamily: [monoFamily, PDF_FONT_FAMILY],
      bodyUrls: PDF_CJK_FONT_URLS,
      bodyFallbackUrls: [],
      monoFamily,
      monoUrls: useDmMono ? PDF_DM_MONO_TTF_URLS : PDF_JETBRAINS_MONO_TTF_URLS,
    };
  }

  return notoPlan(category);
}
