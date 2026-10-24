import { useLocale } from "@/i18n";
import type { ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getArtifactScaleRange } from "./artifactPanZoomScale";
import { useArtifactTransform } from "./panzoom/useArtifactTransform";
import { useArtifactInteractions } from "./panzoom/useArtifactInteractions";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ArtifactPanZoom.tsx#messages:1">`
zh-Hans:
  zoomedDiagramDragOrScrollToPan: "已放大的图形，可拖动或滚轮平移"
  diagramPreview: "图形预览"
  zoomOut: "缩小"
  zoomIn: "放大"
  zoomInThenDragOrScrollToPan: "放大后可拖动/滚轮平移"
  fitToWindow: "适配窗口"
en:
  zoomedDiagramDragOrScrollToPan: "Zoomed diagram. Drag or scroll to pan."
  diagramPreview: "Diagram preview"
  zoomOut: "Zoom out"
  zoomIn: "Zoom in"
  zoomInThenDragOrScrollToPan: "Zoom in, then drag or scroll to pan"
  fitToWindow: "Fit to window"
ja:
  zoomedDiagramDragOrScrollToPan: "拡大された図です。ドラッグまたはスクロールで移動できます"
  diagramPreview: "図のプレビュー"
  zoomOut: "縮小"
  zoomIn: "拡大"
  zoomInThenDragOrScrollToPan: "拡大後はドラッグまたはスクロールで移動できます"
  fitToWindow: "ウィンドウに合わせる"
`;
const t = createTranslator(messages);

interface ArtifactPanZoomProps {
  children: ReactNode;
  contentKey?: string;
  className?: string;
  minHeight?: number;
}

export function ArtifactPanZoom({
  children,
  contentKey,
  className,
  minHeight = 220,
}: ArtifactPanZoomProps) {
  useLocale();
  const transform = useArtifactTransform(contentKey);
  const {
    viewportRef,
    contentRef,
    scale,
    fitScale,
    ready,
    isZoomedIn,
    fitToViewport,
    zoomByStep,
  } = transform;
  const { dragging, onPointerDown } =
    useArtifactInteractions(transform);
  const percent = Math.round((scale / Math.max(fitScale, 0.0001)) * 100);
  const { minScale, maxScale } = getArtifactScaleRange(fitScale);
  const atMinZoom = scale <= minScale + 0.001;
  const atMaxZoom = scale >= maxScale - 0.001;
  const atFitZoom = Math.abs(scale - fitScale) <= 0.001;

  return (
    <div
      ref={viewportRef}
      className={cn(
        "notebook-ai-artifact-panzoom relative overflow-hidden",
        isZoomedIn && "is-zoomed",
        dragging && "is-dragging",
        className,
      )}
      style={{ minHeight }}
      onPointerDown={onPointerDown}
      role="img"
      aria-label={isZoomedIn ? t("zoomedDiagramDragOrScrollToPan") : t("diagramPreview")}
    >
      <div
        ref={contentRef}
        className="notebook-ai-artifact-panzoom-content"
        style={{
          opacity: ready ? 1 : 0,
        }}
      >
        {children}
      </div>

      <TooltipProvider delayDuration={300}>
        <div className="notebook-ai-artifact-panzoom-controls pointer-events-none absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-[var(--goose-control-radius)] bg-background/95 p-0.5 shadow-[var(--goose-menu-shadow)]">
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                type="button"
                tone="muted"
                size="sm"
                className="pointer-events-auto cursor-pointer "
                aria-label={t("zoomOut")}
                disabled={atMinZoom}
                onClick={() => zoomByStep(-1)}
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("zoomOut")}</TooltipContent>
          </Tooltip>

          <span className="pointer-events-none min-w-[40px] select-none text-center text-[11px] tabular-nums text-muted-foreground">
            {percent}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                type="button"
                tone="muted"
                size="sm"
                className="pointer-events-auto cursor-pointer "
                aria-label={t("zoomIn")}
                disabled={atMaxZoom}
                onClick={() => zoomByStep(1)}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("zoomInThenDragOrScrollToPan")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                type="button"
                tone="muted"
                size="sm"
                className="pointer-events-auto cursor-pointer "
                aria-label={t("fitToWindow")}
                disabled={atFitZoom}
                onClick={() => fitToViewport()}
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("fitToWindow")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
