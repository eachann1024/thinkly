import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { Minus, Plus, RotateCcw } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";

const messages = i18nYaml<"src/windows/views/preview/PreviewZoomControls.tsx#messages:1">`
zh-Hans:
  zoomOut: "缩小"
  zoomIn: "放大"
  fit: "适配窗口"
en:
  zoomOut: "Zoom out"
  zoomIn: "Zoom in"
  fit: "Fit to window"
ja:
  zoomOut: "縮小"
  zoomIn: "拡大"
  fit: "ウィンドウに合わせる"
`;
const t = createTranslator(messages);

export function PreviewZoomControls({
  percent,
  onZoomOut,
  onZoomIn,
  onFit,
}: {
  percent: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
}) {
  useLocale();
  return (
    <div className="flex items-center gap-0.5" data-electron-no-drag>
      <IconButton type="button" tone="muted" size="sm" aria-label={t("zoomOut")} disabled={percent <= 25} onClick={onZoomOut}>
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
      </IconButton>
      <span className="goose-tabular min-w-11 text-center text-xs text-muted-foreground">{percent}%</span>
      <IconButton type="button" tone="muted" size="sm" aria-label={t("zoomIn")} disabled={percent >= 400} onClick={onZoomIn}>
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
      </IconButton>
      <IconButton type="button" tone="muted" size="sm" aria-label={t("fit")} onClick={onFit}>
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}
