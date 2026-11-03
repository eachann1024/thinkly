import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { FontFamily, Page } from "@/types";
import {
  IMAGE_EXPORT_DEFAULT_WIDTH,
  IMAGE_EXPORT_WIDTHS,
  type ImageExportWidth,
} from "./contentWidth";
import { normalizeCardThemeId, type CardThemeId } from "./themes";
import {
  normalizeWatermarkConfig,
  type WatermarkConfig,
} from "./watermark";

export type ImageExportWindowScope = "page" | "selection";

export type ImageExportWindowPayload = {
  pageId: string;
  title: string;
  scope: ImageExportWindowScope;
  pageContent: BlockNoteContent;
  selection: BlockNoteContent;
  fontFamily: FontFamily;
  localFilePath?: string;
  isDark: boolean;
  editorFontSize?: number;
  themeId: CardThemeId;
  watermark: WatermarkConfig;
  width: ImageExportWidth;
};

const FONT_FAMILIES = new Set<FontFamily>(["default", "serif", "mono"]);

function blocksOf(value: unknown): BlockNoteContent {
  return Array.isArray(value) ? (value as BlockNoteContent) : [];
}

function widthOf(value: unknown): ImageExportWidth {
  return IMAGE_EXPORT_WIDTHS.find((width) => width === value) ?? IMAGE_EXPORT_DEFAULT_WIDTH;
}

export function parseImageExportWindowPayload(value: unknown): ImageExportWindowPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.pageId !== "string" || !raw.pageId.trim()) return null;
  if (typeof raw.title !== "string") return null;
  if (raw.scope !== "page" && raw.scope !== "selection") return null;
  const pageContent = blocksOf(raw.pageContent);
  const selection = blocksOf(raw.selection);
  const fontFamily = FONT_FAMILIES.has(raw.fontFamily as FontFamily)
    ? (raw.fontFamily as FontFamily)
    : "default";
  const editorFontSize = typeof raw.editorFontSize === "number" && Number.isFinite(raw.editorFontSize)
    ? raw.editorFontSize
    : undefined;
  return {
    pageId: raw.pageId,
    title: raw.title,
    scope: raw.scope,
    pageContent,
    selection,
    fontFamily,
    localFilePath: typeof raw.localFilePath === "string" && raw.localFilePath ? raw.localFilePath : undefined,
    isDark: raw.isDark === true,
    editorFontSize,
    themeId: normalizeCardThemeId(raw.themeId),
    watermark: normalizeWatermarkConfig(
      raw.watermark && typeof raw.watermark === "object" && !Array.isArray(raw.watermark)
        ? raw.watermark as Partial<WatermarkConfig>
        : null,
    ),
    width: widthOf(raw.width),
  };
}

export function buildImageExportWindowPayload(input: {
  page: Page;
  selection: BlockNoteContent;
  themeId: unknown;
  watermark: Partial<WatermarkConfig> | null | undefined;
  isDark: boolean;
  editorFontSize?: number;
  width?: ImageExportWidth;
}): ImageExportWindowPayload {
  const selection = Array.isArray(input.selection) ? input.selection : [];
  const content = Array.isArray(input.page.content) ? input.page.content : [];
  return {
    pageId: input.page.id,
    title: getPageTitle(input.page),
    scope: selection.length > 0 ? "selection" : "page",
    pageContent: content,
    selection,
    fontFamily: input.page.fontFamily ?? "default",
    localFilePath: input.page.localFilePath,
    isDark: input.isDark,
    editorFontSize: input.editorFontSize,
    themeId: normalizeCardThemeId(input.themeId),
    watermark: normalizeWatermarkConfig(input.watermark),
    width: input.width ?? IMAGE_EXPORT_DEFAULT_WIDTH,
  };
}

export async function openImageExportWindow(payload: ImageExportWindowPayload): Promise<void> {
  await window.gooseDesktop?.auxiliary?.open({ kind: "image-export", payload });
}
