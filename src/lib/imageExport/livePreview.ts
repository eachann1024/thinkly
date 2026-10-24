import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/livePreview.ts#localMessages:1">`
zh-Hans:
  selectedContent: "选中内容"
  untitled: "无标题"
en:
  selectedContent: "Selected content"
  untitled: "Untitled"
ja:
  selectedContent: "選択した内容"
  untitled: "無題"
`;
const uiText = createTranslator(localMessages);
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { cloneExportBlocks } from "@/lib/export/prepareExportBlocks";
import type { Page } from "@/types";
import {
  buildStyledHTML,
  collectBlockInlineStyles,
  renderBlocks,
} from "./domSerializer";
import { takeBlocksForPreview } from "./previewBudget";
import type { CardTheme } from "./themes";
import type { WatermarkConfig } from "./watermark";
import { normalizeWatermarkConfig } from "./watermark";
import { splitImageExportTitle } from "./titleLift";

export const IMAGE_EXPORT_LIVE_PREVIEW_MIN_WIDTH = 1000;

export const IMAGE_EXPORT_OPTIONS_CORNER_MIN_WIDTH = 1200;

export function shouldShowImageExportLivePreview(width: number): boolean {
  return Number.isFinite(width) && width >= IMAGE_EXPORT_LIVE_PREVIEW_MIN_WIDTH;
}

export function shouldShowImageExportOptionsCorner(width: number): boolean {
  return Number.isFinite(width) && width >= IMAGE_EXPORT_OPTIONS_CORNER_MIN_WIDTH;
}

function firstInlineText(content: unknown): string {
  if (typeof content === "string") return content.trim().slice(0, 80);
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const part of content) {
    if (out.length >= 80) break;
    if (typeof part === "string") out += part;
    else if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
      out += (part as { text: string }).text;
    }
  }
  return out.trim().slice(0, 80);
}

function previewTitle(
  page: Pick<Page, "content" | "localFilePath"> | null | undefined,
  fallback: string,
): string {
  if (!page) return fallback;
  if (page.localFilePath) return getPageTitle(page as Page) || fallback;
  const content = page.content;
  const first = Array.isArray(content) ? content[0] : undefined;
  const heading =
    first && typeof first === "object" && (first as { type?: string }).type === "heading"
      ? firstInlineText((first as { content?: unknown }).content)
      : "";
  if (heading) return heading;
  if (!Array.isArray(content) || content.length > 80) return fallback;
  return getPageTitle(page as Page) || fallback;
}

export function getImageExportPreviewSource(params: {
  mode: "page" | "selection";
  page?: Pick<Page, "content" | "localFilePath"> | null;
  blocks?: BlockNoteContent;
}): { title: string; blocks: BlockNoteContent } {
  const page = params.page;
  const selection = Array.isArray(params.blocks) ? params.blocks : [];
  if (params.mode === "selection" && selection.length > 0) {
    return {
      title: previewTitle(page, uiText("selectedContent")),
      blocks: takeBlocksForPreview(selection) as BlockNoteContent,
    };
  }

  const raw = page?.content;
  const blocks = Array.isArray(raw)
    ? raw
    : cloneExportBlocks(raw, { ensureFirstTitle: !page?.localFilePath });
  return {
    title: previewTitle(page, uiText("untitled")),
    blocks: takeBlocksForPreview(blocks) as BlockNoteContent,
  };
}

export function buildImageExportPreviewHtml(params: {
  title: string;
  blocks: BlockNoteContent;
  theme: CardTheme;
  mode: "page" | "selection";
  watermarkConfig?: WatermarkConfig;
}): string {
  const wm = normalizeWatermarkConfig(params.watermarkConfig);
  const prepared = cloneExportBlocks(takeBlocksForPreview(params.blocks), {
    ensureFirstTitle: false,
  });
  const { blocks: blocksToRender, titleBlock } = splitImageExportTitle({
    blocks: prepared,
    pageTitle: params.title,
    showTitle: wm.showTitle,
    mode: params.mode,
  });
  const blocksHtml = renderBlocks(blocksToRender, params.theme);
  return buildStyledHTML({
    title: params.title,
    blocksHtml,
    theme: params.theme,
    watermarkConfig: wm,
    preview: true,
    titleInlineStyle: collectBlockInlineStyles(titleBlock, params.theme),
  });
}
