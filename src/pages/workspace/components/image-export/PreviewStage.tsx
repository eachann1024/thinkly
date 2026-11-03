import { useLocale, createTranslator, getFormatLocale, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/PreviewStage.tsx#localMessages:1">`
zh-Hans:
  preview: "预览"
  excerpt: "预览只显示前 {{shown}} 块，导出是全文（共 {{total}} 块，约 {{height}} px 高）"
  emptyTitle: "编辑器里没有选中内容"
  emptyBody: "回到笔记选中一段再来，或者直接导出整页。"
  back: "返回笔记"
  wholePage: "导出整页"
  fit: "适应"
  zoomOut: "缩小"
  zoomIn: "放大"
en:
  preview: "Preview"
  excerpt: "Preview shows the first {{shown}} blocks. Export is the full note ({{total}} blocks, about {{height}} px tall)."
  emptyTitle: "Nothing is selected in the editor"
  emptyBody: "Go back and select a passage, or export the whole page."
  back: "Back to note"
  wholePage: "Export whole page"
  fit: "Fit"
  zoomOut: "Zoom out"
  zoomIn: "Zoom in"
ja:
  preview: "プレビュー"
  excerpt: "プレビューは先頭 {{shown}} ブロックだけです。書き出しは全文（全 {{total}} ブロック、約 {{height}} px）"
  emptyTitle: "エディタで何も選択されていません"
  emptyBody: "ノートに戻って範囲を選ぶか、ページ全体を書き出してください。"
  back: "ノートに戻る"
  wholePage: "ページ全体を書き出す"
  fit: "合わせる"
  zoomOut: "縮小"
  zoomIn: "拡大"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Image, Minus, Plus } from "@/components/ui/icons";
import { PreviewFrame } from "@/components/ui/image-export/PreviewFrame";
import { cloneExportBlocks } from "@/lib/export/prepareExportBlocks";
import { resolveCardTheme } from "@/lib/imageExport";
import { buildImageExportPreviewHtml } from "@/lib/imageExport/livePreview";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { exportSafePixelRatio } from "@/lib/imageExport/capture/pixelRatio";
import { takeBlocksForPreview } from "@/lib/imageExport/previewBudget";
import { notebookThemeContextFromPage } from "@/lib/imageExport/themeContext";
import { cn } from "@/lib/utils";
import { useSettings } from "@/stores/useSettings";
import {
  activeImageExportThemeId,
  useImageExportView,
} from "@/stores/useImageExportView";
import type { Page } from "@/types";
import { describeExportClarity } from "./clarityCopy";

export function PreviewStage({ page }: { page: Page }) {
  useLocale();
  const watermark = useSettings((s) => s.imageExportWatermark);
  const pageTheme = useSettings((s) => s.imageExportThemeId);
  const scope = useImageExportView((s) => s.scope);
  const blocks = useImageExportView((s) => s.blocks);
  const selectionTheme = useImageExportView((s) => s.selectionTheme);
  const width = useImageExportView((s) => s.width);
  const ratio = useImageExportView((s) => s.ratio);
  const height = useImageExportView((s) => s.height);
  const canvasRef = useRef<HTMLElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState(0);
  const empty = scope === "selection" && blocks.length === 0;
  const themeId = activeImageExportThemeId(scope, selectionTheme, pageTheme);
  const full = useMemo(
    () =>
      scope === "selection"
        ? blocks
        : cloneExportBlocks(page.content, { ensureFirstTitle: !page.localFilePath }),
    [scope, blocks, page.content, page.localFilePath],
  );
  const previewBlocks = useMemo(
    () => takeBlocksForPreview(full) as typeof full,
    [full],
  );
  const shown = previewBlocks.length;
  const clipped = shown > 0 && shown < full.length;
  const measureRef = useRef({ clipped, shown, total: full.length, width });
  measureRef.current = { clipped, shown, total: full.length, width };
  const onHeight = useCallback((next: number) => {
    setPreviewHeight(next);
    const current = measureRef.current;
    const fullHeight =
      current.clipped && current.shown > 0
        ? Math.round((next * current.total) / current.shown)
        : next;
    useImageExportView.getState().setMeasure(fullHeight, exportSafePixelRatio(current.width, fullHeight));
  }, []);
  const html = useMemo(() => {
    if (empty) return "";
    const theme = resolveCardTheme(themeId, notebookThemeContextFromPage(page));
    return buildImageExportPreviewHtml({
      title: getPageTitle(page),
      blocks: previewBlocks,
      theme,
      mode: scope,
      watermarkConfig: watermark,
      contentWidth: width,
    });
  }, [empty, themeId, page, previewBlocks, scope, watermark, width]);
  useLayoutEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setCanvasWidth(node.clientWidth));
    observer.observe(node);
    setCanvasWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);
  const fit = canvasWidth > 64 ? Math.min(1, (canvasWidth - 64) / width) : 1;
  const scale = zoom ?? fit;
  const clarity = describeExportClarity({ empty, width, height, ratio, scope });
  const excerpt =
    !empty && clipped
      ? uiText("excerpt", {
          shown,
          total: full.length,
          height: (height ?? 0).toLocaleString(getFormatLocale()),
        })
      : "";

  return (
    <main
      ref={canvasRef}
      aria-label={uiText("preview")}
      className="relative min-w-0 flex-1 overflow-auto bg-muted"
    >
      {excerpt ? (
        <div role="note" className="pointer-events-none sticky top-0 z-[1] flex justify-center px-3 pt-2.5">
          <span className="rounded-md border border-border bg-[var(--goose-menu-surface)] px-2.5 py-1 text-xs text-foreground">
            {excerpt}
          </span>
        </div>
      ) : null}
      <div className={cn("flex min-h-full justify-center px-8 pb-16 pt-10", empty && "items-center")}>
        {empty ? (
          <div className="flex w-[300px] flex-col items-center gap-2.5 rounded-[10px] border border-dashed border-border bg-[var(--goose-menu-surface)] px-6 py-7 text-center">
            <Image className="size-[22px] text-[var(--goose-text-secondary)]" />
            <span className="text-sm font-medium">{uiText("emptyTitle")}</span>
            <span className="text-xs leading-[18px] text-[var(--goose-text-secondary)]">{uiText("emptyBody")}</span>
            <div className="mt-1 flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => useImageExportView.getState().exit()}>
                {uiText("back")}
              </Button>
              <Button type="button" size="sm" onClick={() => useImageExportView.getState().setScope("page")}>
                {uiText("wholePage")}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ width: Math.round(width * scale), height: previewHeight > 0 ? Math.round(previewHeight * scale) : undefined }}>
            <PreviewFrame
              html={html}
              title={getPageTitle(page)}
              onHeightChange={onHeight}
              style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}
            />
          </div>
        )}
      </div>
      <div className="pointer-events-none sticky bottom-3 mx-3 -mt-12 flex items-center justify-between">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs tabular-nums",
            clarity.tone === "danger" && !empty
              ? "bg-[var(--goose-color-danger-subtle-bg)] text-[var(--goose-color-danger)]"
              : "bg-[var(--goose-menu-surface)] text-[var(--goose-text-secondary)]",
          )}
        >
          {clarity.chip}
        </span>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border border-border bg-[var(--goose-menu-surface)] p-0.5">
          <IconButton type="button" size="icon" tone="muted" aria-label={uiText("zoomOut")} onClick={() => setZoom(step(scale, -0.1))}>
            <Minus className="size-3.5" />
          </IconButton>
          <button type="button" className="w-11 text-center text-xs tabular-nums" onClick={() => setZoom(null)}>
            {zoom == null ? uiText("fit") : `${Math.round(scale * 100)}%`}
          </button>
          <IconButton type="button" size="icon" tone="muted" aria-label={uiText("zoomIn")} onClick={() => setZoom(step(scale, 0.1))}>
            <Plus className="size-3.5" />
          </IconButton>
        </div>
      </div>
    </main>
  );
}

function step(scale: number, delta: number): number {
  return Math.min(2, Math.max(0.2, Math.round((scale + delta) * 10) / 10));
}
