import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPreviewActionTooltip,
  previewPointerHandlers,
} from "@/lib/preview/previewAction";
import type { CodeBlockToolbarProps, CodeCopyState } from "./codeToolbarTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
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
ja:
  imageCopied: "画像をコピーしました"
  codeCopied: "コードをコピーしました"
  copyImage: "画像をコピー"
  copyCode: "コードをコピー"
  downloadImage: "画像をダウンロード"
  codeBlockDisplayMode: "コードブロックの表示モード"
  showCode: "コードを表示"
  code: "コード"
  showPreview: "プレビューを表示"
  preview: "プレビュー"
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
  copied,
  copyingImage,
  handleCopy,
}: CodeBlockToolbarProps & CodeCopyState) {
  useLocale();
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
            className="goose-code-island-btn goose-accent-selection"
            {...previewPointerHandlers({
              disabled: !canPreview,
              onInternal: () => onOpenPreview?.(),
              onSystem: () => onSystemPreview?.(),
            })}
          >
            <GooseIcons.Maximize2 className="goose-code-island-icon" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{getPreviewActionTooltip()}</TooltipContent>
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
            data-goose-secondary="true"
            className="goose-code-island-btn goose-accent-selection"
          >
            <GooseIcons.Download className="goose-code-island-icon" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("downloadImage")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            disabled={isCopyingImage || (copiesImage && !canPreview)}
            className="goose-code-island-btn goose-accent-selection"
            aria-label={copyLabel}
          >
            {isCopyingImage ? (
              <GooseIcons.Loader2 className="goose-code-island-icon animate-spin" />
            ) : copied ? (
              <GooseIcons.Check
                className="goose-code-island-icon text-[var(--goose-color-success)]"
              />
            ) : (
              <GooseIcons.Copy className="goose-code-island-icon" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{copyLabel}</TooltipContent>
      </Tooltip>

      <span className="goose-code-island-sep" aria-hidden="true" />

      <div
        className="goose-code-display-toggle"
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
          className="goose-code-display-toggle-button goose-accent-selection"
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
          className="goose-code-display-toggle-button goose-accent-selection"
        >
          {t("preview")}
        </Button>
      </div>
    </>
  );
}
