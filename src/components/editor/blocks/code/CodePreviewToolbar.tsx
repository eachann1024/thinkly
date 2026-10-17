import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PREVIEW_ACTION_TOOLTIP,
  previewPointerHandlers,
} from "@/lib/preview/previewAction";
import type { CodeBlockToolbarProps, CodeCopyState } from "./codeToolbarTypes";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/CodePreviewToolbar.tsx#messages:1">`
zh-Hans:
  imageCopied: "已复制图片"
  codeCopied: "已复制代码"
  copyImage: "复制图片"
  copyCode: "复制代码"
  downloadImage: "下载图片"
  codeBlockDisplayMode: "代码块显示模式"
  showCode: "显示代码"
  code: "代码"
  showPreview: "显示预览"
  preview: "预览"
en:
  imageCopied: "Image copied"
  codeCopied: "Code copied"
  copyImage: "Copy image"
  copyCode: "Copy code"
  downloadImage: "Download image"
  codeBlockDisplayMode: "Code block display mode"
  showCode: "Show code"
  code: "Code"
  showPreview: "Show preview"
  preview: "Preview"
`;
const t = createTranslator(messages);


export function CodePreviewToolbar({
  canPreview,
  onOpenPreview,
  onSystemPreview,
  onDownloadPreview,
  onCopyPreview,
  previewMode,
  onPreviewModeChange,
  chipClass,
  copied,
  copyingImage,
  handleCopy,
}: CodeBlockToolbarProps & CodeCopyState & { chipClass: string }) {
  const copiesImage = previewMode === "preview" && Boolean(onCopyPreview);
  const isCopyingImage = copiesImage && copyingImage;
  const copyLabel = copied
    ? copiesImage
      ? t("imageCopied")
      : t("codeCopied")
    : copiesImage
      ? t("copyImage")
      : t("copyCode");
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canPreview}
            className={cn("h-7 w-7 p-0", chipClass)}
            {...previewPointerHandlers({
              disabled: !canPreview,
              onInternal: () => onOpenPreview?.(),
              onSystem: () => onSystemPreview?.(),
            })}
          >
            <GooseIcons.Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{PREVIEW_ACTION_TOOLTIP}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("downloadImage")}
            onClick={onDownloadPreview}
            disabled={!canPreview}
            className={cn("h-7 w-7 p-0", chipClass)}
          >
            <GooseIcons.Download className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("downloadImage")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            disabled={isCopyingImage || (copiesImage && !canPreview)}
            className={cn("h-7 w-7 p-0", chipClass)}
            aria-label={copyLabel}
          >
            {isCopyingImage ? (
              <GooseIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
              <GooseIcons.Check
                className={cn(
                  "h-3.5 w-3.5",
                  "text-[var(--goose-color-success)]",
                )}
              />
            ) : (
              <GooseIcons.Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copyLabel}</TooltipContent>
      </Tooltip>

      <div
        className="goose-code-display-toggle inline-flex h-7 items-center gap-0.5 rounded-[12px] p-0.5"
        role="tablist"
        aria-label={t("codeBlockDisplayMode")}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={previewMode === "code"}
          aria-label={t("showCode")}
          onClick={() => onPreviewModeChange?.("code")}
          className={cn(
            "goose-code-display-toggle-button h-6 px-2.5 text-xs",
            chipClass,
            previewMode === "code" && "goose-code-action-active",
          )}
        >
          {t("code")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={previewMode === "preview"}
          aria-label={t("showPreview")}
          onClick={() => onPreviewModeChange?.("preview")}
          disabled={!canPreview}
          className={cn(
            "goose-code-display-toggle-button h-6 px-2.5 text-xs",
            chipClass,
            previewMode === "preview" && "goose-code-action-active",
          )}
        >
          {t("preview")}
        </Button>
      </div>
    </>
  );
}
