import { useLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/AiPanelResizeEdge.tsx#messages:1">`
zh-Hans:
  resizeAiPanelLeftAndRightArrowsHome: "调整 AI 面板宽度：左右方向键；Home 最窄，End 最宽"
  resizeAiPanel: "调整 AI 面板宽度"
  detailPixels: "{{value1}} 像素"
en:
  resizeAiPanelLeftAndRightArrowsHome: "Resize AI panel: Left and Right arrows; Home for minimum, End for maximum"
  resizeAiPanel: "Resize AI panel"
  detailPixels: "{{value1}} pixels"
`;
const t = createTranslator(messages);


interface AiPanelResizeEdgeProps {
  isResizing: boolean;
  width: number;
  maxWidth: number;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

/** 命中区居中跨过两栏共用的分隔线，不额外占用布局宽度。 */
export function AiPanelResizeEdge({
  isResizing,
  width,
  maxWidth,
  onKeyDown,
  onPointerDown,
}: AiPanelResizeEdgeProps) {
  useLocale();
  return (
    <div
      className="absolute top-0 z-[60] h-full cursor-col-resize touch-none group/resize"
      style={{ left: "-8px", width: "16px" }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-valuemin={Math.min(320, maxWidth)}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      aria-valuetext={t("detailPixels", { value1: Math.round(width) })}
      title={t("resizeAiPanelLeftAndRightArrowsHome")}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("resizeAiPanel")}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 h-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150",
          isResizing
            ? "opacity-100"
            : "opacity-0 group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100",
        )}
        style={{
          width: "1px",
          borderRadius: 0,
          background: isResizing
            ? "var(--workspace-resize-line-active)"
            : "var(--workspace-resize-line)",
        }}
      />
    </div>
  );
}
