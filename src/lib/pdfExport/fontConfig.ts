
import {
  PDF_FONT_FAMILY,
  PDF_MONO_FAMILY,
  PDF_CJK_FONT_URLS,
  firstFamilyName,
  resolvePdfFontPlan,
  type PdfPageFontFamily,
  type PdfCustomFonts,
} from "./fontPlan";
export * from "./fontPlan";

const MIN_CJK_FONT_BYTES = 100_000;
const MIN_LATIN_FONT_BYTES = 4_000;

const dataUrlByUrl = new Map<string, string | null>();
const inflightByUrl = new Map<string, Promise<string | null>>();
let registeredKey: string | null = null;
let lastRegisterResult: { ready: boolean; pageFontFamily: string | string[] } | null =
  null;
let hyphenationRegistered = false;

export function resolvePdfFontUrl(relativePath: string, baseHref: string): string {
  return new URL(relativePath, baseHref).href;
}

export function fileUrlToLocalPath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  try {
    const decoded = decodeURIComponent(new URL(url).pathname);
    if (/^\/[A-Za-z]:\//.test(decoded)) return decoded.slice(1);
    return decoded;
  } catch {
    return null;
  }
}

export function toPdfFontDataUrl(base64: string, mime = "font/ttf"): string {
  return `data:${mime};base64,${base64}`;
}

export function resetPdfFontLoadCache(): void {
  dataUrlByUrl.clear();
  inflightByUrl.clear();
  registeredKey = null;
  lastRegisterResult = null;
}

export function isEmbeddablePdfFontUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return path.endsWith(".ttf");
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function guessFontMime(url: string): string {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".ttf")) return "font/ttf";
  if (path.endsWith(".otf")) return "font/otf";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  return "font/ttf";
}

async function loadCachedFontDataUrl(
  url: string,
  minBytes: number,
): Promise<string | null> {
  if (!isEmbeddablePdfFontUrl(url)) return null;
  if (dataUrlByUrl.has(url)) return dataUrlByUrl.get(url) ?? null;
  const existing = inflightByUrl.get(url);
  if (existing) return existing;

  const job = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        dataUrlByUrl.set(url, null);
        return null;
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength < minBytes) {
        dataUrlByUrl.set(url, null);
        return null;
      }
      const mime = guessFontMime(url);
      if (mime !== "font/ttf") {
        dataUrlByUrl.set(url, null);
        return null;
      }
      const dataUrl = toPdfFontDataUrl(uint8ToBase64(new Uint8Array(buf)), mime);
      dataUrlByUrl.set(url, dataUrl);
      return dataUrl;
    } catch {
      dataUrlByUrl.set(url, null);
      return null;
    }
  })();

  inflightByUrl.set(url, job);
  try {
    return await job;
  } finally {
    inflightByUrl.delete(url);
  }
}

export async function loadFirstPdfFontDataUrl(
  urls: readonly string[],
  minBytes = MIN_CJK_FONT_BYTES,
): Promise<string | null> {
  for (const url of urls) {
    const src = await loadCachedFontDataUrl(url, minBytes);
    if (src) return src;
  }
  return null;
}

export async function loadPdfFontDataUrl(): Promise<string | null> {
  return loadFirstPdfFontDataUrl(PDF_CJK_FONT_URLS);
}

function registerFamilyVariants(Font: typeof import("@react-pdf/renderer").Font, family: string, src: string) {
  Font.register({ family, src });
  Font.register({ family, src, fontWeight: "bold" });
  Font.register({ family, src, fontStyle: "italic" });
  Font.register({ family, src, fontWeight: "bold", fontStyle: "italic" });
}

function failedRegisterResult(): { ready: boolean; pageFontFamily: string | string[] } {
  return { ready: false, pageFontFamily: PDF_FONT_FAMILY };
}

export async function registerPdfFonts(options?: {
  fontFamily?: PdfPageFontFamily | null;
  customFonts?: PdfCustomFonts | null;
}): Promise<{ ready: boolean; pageFontFamily: string | string[] }> {
  const plan = resolvePdfFontPlan(options?.fontFamily, options?.customFonts);
  const planKey = `${plan.embed}:${plan.category}:${firstFamilyName(options?.customFonts?.[plan.category]?.font)}`;
  if (registeredKey === planKey && lastRegisterResult?.ready) {
    return lastRegisterResult;
  }

  try {
    const { Font } = await import("@react-pdf/renderer");
    const bodySrc = await loadFirstPdfFontDataUrl(plan.bodyUrls);
    if (!bodySrc) {
      console.warn("[pdfExport] 未能加载 Noto Sans SC TTF，中止 react-pdf 字体注册。");
      return failedRegisterResult();
    }

    const monoSrc = await loadFirstPdfFontDataUrl(
      plan.monoUrls,
      MIN_LATIN_FONT_BYTES,
    );
    if (!monoSrc) {
      console.warn(`[pdfExport] 未能加载 ${plan.monoFamily} TTF，代码块回退已注册的 CJK 字体。`);
    }

    const aliases = new Set([plan.bodyFamily, PDF_FONT_FAMILY, "Inter"]);
    for (const family of aliases) {
      registerFamilyVariants(Font, family, bodySrc);
    }

    if (monoSrc) {
      registerFamilyVariants(Font, plan.monoFamily, monoSrc);
      registerFamilyVariants(Font, PDF_MONO_FAMILY, monoSrc);
      registerFamilyVariants(Font, "GeistMono", monoSrc);
    } else {
      registerFamilyVariants(Font, plan.monoFamily, bodySrc);
      registerFamilyVariants(Font, PDF_MONO_FAMILY, bodySrc);
      registerFamilyVariants(Font, "GeistMono", bodySrc);
    }

    if (!hyphenationRegistered) {
      Font.registerHyphenationCallback((word) => [word]);
      hyphenationRegistered = true;
    }

    let pageFontFamily: string | string[];
    if (plan.embed !== "noto") {
      const stack: string[] = [];
      if (monoSrc) stack.push(plan.monoFamily);
      stack.push(plan.bodyFamily);
      pageFontFamily = stack.length === 1 ? stack[0] : stack;
    } else {
      pageFontFamily = plan.bodyFamily;
    }

    lastRegisterResult = { ready: true, pageFontFamily };
    registeredKey = planKey;
    return lastRegisterResult;
  } catch (error) {
    console.warn("[pdfExport] 字体注册失败。", error);
    return failedRegisterResult();
  }
}
