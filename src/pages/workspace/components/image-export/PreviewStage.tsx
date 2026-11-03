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
import type { NotebookCardThemeContext } from "@/lib/imageExport";
import { cn } from "@/lib/utils";
import { closeAuxiliary } from "@/windows/AuxiliaryWindowContext";
import {
  sessionActiveTheme,
  sessionBlocks,
  useImageExportSession,
} from "@/windows/views/image-export/imageExportSession";
import type { Page } from "@/types";
import { describeExportClarity } from "./clarityCopy";
import { usePreparedPreviewBlocks } from "./usePreparedPreviewBlocks";

export function PreviewStage({
  page,
  themeContext,
}: {
  page: Page;
  themeContext: NotebookCardThemeContext;
}) {
  useLocale();
  const watermark = useImageExportSession((s) => s.watermark);
  const pageTheme = useImageExportSession((s) => s.themeId);
  const scope = useImageExportSession((s) => s.scope);
  const blocks = useImageExportSession(sessionBlocks);
  const selectionTheme = useImageExportSession((s) => s.selectionTheme);
  const width = useImageExportSession((s) => s.width);
  const ratio = useImageExportSession((s) => s.ratio);
  const height = useImageExportSession((s) => s.height);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [previewHeight, setPreviewHeight] = useState(0);
  const empty = scope === "selection" && blocks.length === 0;
  const themeId = sessionActiveTheme({ scope, selectionTheme, themeId: pageTheme });
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
    useImageExportSession.getState().setMeasure(fullHeight, exportSafePixelRatio(current.width, fullHeight));
  }, []);
  const theme = useMemo(
    () => (empty ? null : resolveCardTheme(themeId, themeContext)),
    [empty, themeId, themeContext],
  );
  const renderedBlocks = usePreparedPreviewBlocks(previewBlocks, theme, page.localFilePath);
  const html = useMemo(() => {
    if (!theme) return "";
    return buildImageExportPreviewHtml({
      title: getPageTitle(page),
      blocks: renderedBlocks,
      theme,
      mode: scope,
      watermarkConfig: watermark,
      contentWidth: width,
    });
  }, [theme, page, renderedBlocks, scope, watermark, width]);
  useLayoutEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setCanvasWidth(node.clientWidth));
    observer.observe(node);
    setCanvasWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);
  const displayWidth = width === 720 ? 420 : width === 1440 ? 600 : 520;
  const fit = Math.min(displayWidth, Math.max(1, canvasWidth - 64)) / width;
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
      aria-label={uiText("preview")}
      className="relative min-w-0 flex-1 overflow-hidden border-y border-border bg-[color-mix(in_srgb,hsl(var(--foreground))_4%,hsl(var(--goose-shell-bg)))]"
    >
      <div ref={canvasRef} className="h-full overflow-auto">
        {excerpt ? (
          <div role="note" className="pointer-events-none sticky top-0 z-[1] flex justify-center px-3 pt-2.5">
            <span className="rounded-md border border-border bg-[var(--goose-menu-surface)] px-2.5 py-1 text-xs text-foreground">
              {excerpt}
            </span>
          </div>
        ) : null}
        <div className={cn("flex min-h-full w-max min-w-full items-start justify-center px-8 pb-[72px] pt-10", empty && "items-center")}>
          {empty ? (
            <div className="flex w-[300px] flex-col items-center gap-2.5 rounded-[10px] border border-dashed border-border bg-[var(--goose-menu-surface)] px-6 py-7 text-center">
              <Image className="size-[22px] text-[var(--goose-text-secondary)]" />
              <span className="text-sm font-medium">{uiText("emptyTitle")}</span>
              <span className="text-xs leading-[18px] text-[var(--goose-text-secondary)]">{uiText("emptyBody")}</span>
              <div className="mt-1 flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void closeAuxiliary()}>
                  {uiText("back")}
                </Button>
                <Button type="button" size="sm" onClick={() => useImageExportSession.getState().setScope("page")}>
                  {uiText("wholePage")}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="shrink-0 overflow-hidden shadow-md"
              style={{ width: Math.round(width * scale), height: previewHeight > 0 ? Math.round(previewHeight * scale) : undefined }}
            >
              <PreviewFrame
                html={html}
                title={getPageTitle(page)}
                onHeightChange={onHeight}
                style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "min-w-0 truncate rounded-md px-2 py-1 text-xs tabular-nums",
            clarity.tone === "danger" && !empty
              ? "bg-[var(--goose-color-danger-subtle-bg)] text-[var(--goose-color-danger)]"
              : "bg-[var(--goose-menu-surface)] text-[var(--goose-text-secondary)]",
          )}
        >
          {clarity.chip}
        </span>
        <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-[var(--goose-menu-surface)] p-0.5">
          <IconButton type="button" size="sm" tone="muted" aria-label={uiText("zoomOut")} onClick={() => setZoom(step(scale, -0.1))}>
            <Minus className="size-3.5" />
          </IconButton>
          <button type="button" className="w-11 text-center text-xs tabular-nums" onClick={() => setZoom(null)}>
            {zoom == null ? uiText("fit") : `${Math.round(scale * 100)}%`}
          </button>
          <IconButton type="button" size="sm" tone="muted" aria-label={uiText("zoomIn")} onClick={() => setZoom(step(scale, 0.1))}>
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
