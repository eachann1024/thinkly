import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/renderBlob.ts#localMessages:1">`
zh-Hans:
  selectedContent: "选中内容"
  selection: "选中"
en:
  selectedContent: "Selected content"
  selection: "Selection"
ja:
  selectedContent: "選択した内容"
  selection: "選択範囲"
`;
const uiText = createTranslator(localMessages);
import type { Page } from "@/types";
import { type BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { extractTitleFromContent } from "@/components/editor/utils/content-text-extractor";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { cloneExportBlocks } from "@/lib/export/prepareExportBlocks";
import { IMAGE_EXPORT_DEFAULT_WIDTH } from "./contentWidth";
import { captureElementToBlob } from "./capture/captureElement";
import {
  buildStyledHTML,
  collectBlockInlineStyles,
  renderBlocks,
} from "./domSerializer";
import { renderMathBlocksAsImages } from "./math";
import { renderMermaidBlocksAsImages } from "./mermaid";
import { resolveImageUrls } from "./remoteImageResolver";
import { resolveCardTheme, type CardThemeId } from "./themes";
import { notebookThemeContextFromPage } from "./themeContext";
import { splitImageExportTitle } from "./titleLift";
import { normalizeWatermarkConfig, type WatermarkConfig } from "./watermark";

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_") || "untitled";
}

export function buildImageFileName(
  title: string,
  theme: { nameEn: string },
  suffix?: string,
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${milliseconds}`;
  const parts = [sanitizeFileName(title || "untitled"), sanitizeFileName(theme.nameEn), ts];
  if (suffix) parts.splice(1, 0, suffix);
  return `${parts.join("_")}.png`;
}

export async function renderImageExportBlob(params: {
  page?: Page | null;
  blocks: Page["content"] | BlockNoteContent;
  themeId: CardThemeId;
  watermarkConfig?: WatermarkConfig;
  mode: "page" | "selection";
  contentWidth?: number;
  title?: string;
}): Promise<{ blob: Blob; filename: string }> {
  const page = params.page;
  const theme = resolveCardTheme(params.themeId, notebookThemeContextFromPage(page));
  const wm = normalizeWatermarkConfig(params.watermarkConfig);
  const title =
    params.mode === "page" && page
      ? getPageTitle(page) || extractTitleFromContent(page.content)
      : page
        ? getPageTitle(page) || params.title || uiText("selectedContent")
        : params.title || uiText("selectedContent");
  const cloned = cloneExportBlocks(params.blocks, {
    ensureFirstTitle: params.mode === "page" && !page?.localFilePath,
  });
  await resolveImageUrls(cloned, page?.localFilePath);
  await renderMermaidBlocksAsImages(cloned, theme);
  await renderMathBlocksAsImages(cloned, theme);
  const { blocks: blocksToRender, titleBlock } = splitImageExportTitle({
    blocks: cloned,
    pageTitle: title,
    showTitle: wm.showTitle,
    mode: params.mode,
  });
  const html = buildStyledHTML({
    title,
    blocksHtml: renderBlocks(blocksToRender, theme),
    theme,
    watermarkConfig: wm,
    titleInlineStyle: collectBlockInlineStyles(titleBlock, theme),
    contentWidth: params.contentWidth ?? IMAGE_EXPORT_DEFAULT_WIDTH,
  });
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  document.body.appendChild(container);
  try {
    const root = container.attachShadow({ mode: "open" });
    root.innerHTML = html;
    const card = root.querySelector(".gooseshot-container");
    if (!(card instanceof HTMLElement)) throw new Error("Failed to create preview element");
    const blob = await captureElementToBlob(card);
    const suffix = params.mode === "selection" ? uiText("selection") : undefined;
    return { blob, filename: buildImageFileName(title, theme, suffix) };
  } finally {
    document.body.removeChild(container);
  }
}
