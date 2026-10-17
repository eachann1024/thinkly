import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/image-export/LivePreviewPane.tsx#localMessages:1">`
zh-Hans:
  exportPreview: "图片导出预览"
en:
  exportPreview: "Image export preview"
ja:
  exportPreview: "画像書き出しプレビュー"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useMemo, useRef, useState } from "react";
import { type CardTheme, type WatermarkConfig } from "@/lib/imageExport";
import { buildImageExportPreviewHtml, getImageExportPreviewSource } from "@/lib/imageExport/livePreview";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";

import type { ImageExportThemeSelectorProps } from "./theme-model";
import { PreviewFrame } from "./PreviewFrame";

export function LivePreviewPane({
  open,
  mode,
  page,
  blocks,
  theme,
  watermarkConfig,
}: {
  open: boolean;
  mode: "page" | "selection";
  page?: ImageExportThemeSelectorProps["page"];
  blocks?: BlockNoteContent;
  theme: CardTheme;
  watermarkConfig: WatermarkConfig;
}) {
  const locale = useLocale();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);
  const [frameHeight, setFrameHeight] = useState(900);

  const source = useMemo(
    () => getImageExportPreviewSource({ mode, page, blocks }),
    [mode, page, blocks, locale],
  );
  const html = useMemo(
    () =>
      buildImageExportPreviewHtml({
        title: source.title,
        blocks: source.blocks,
        theme,
        mode,
        watermarkConfig,
      }),
    [source, theme, mode, watermarkConfig, locale],
  );

  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = (width: number) => {
      const next = width > 0 ? Math.min(1, width / 680) : 0.42;
      setScale(Number.isFinite(next) && next > 0 ? next : 0.42);
    };
    const style = getComputedStyle(viewport);
    updateScale(viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateScale(entry.contentRect.width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [open]);

  return (
    <aside
      aria-label={uiText("exportPreview")}
      className="min-h-0 flex flex-col overflow-hidden rounded-[12px] border bg-muted/20"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
          {uiText("exportPreview")}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {theme.name}
        </span>
      </div>
      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto p-3 [scrollbar-gutter:stable]">
        <div
          style={{
            width: 680 * scale,
            height: frameHeight * scale,
            position: "relative",
          }}
        >
          <PreviewFrame
            title={uiText("exportPreview")}
            html={html}
            onHeightChange={setFrameHeight}
            style={{
              width: 680,
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: 0,
              pointerEvents: "none",
              display: "block",
              background: "transparent",
              colorScheme: theme.mode,
            }}
          />
        </div>
      </div>
    </aside>
  );
}
