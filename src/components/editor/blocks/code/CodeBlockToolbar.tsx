import { useState } from "react";
import {
  Popover,
  PopoverAction,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectionToolbarSurface } from "@/components/editor/toolbars/SelectionToolbarSurface";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFormatCode } from "@/components/editor/hooks/useFormatCode";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { FORMAT_SUPPORTED_LANGUAGES } from "./codeBlockLanguages";
import { CodeLatexHints } from "./CodeLatexHints";
import { CodePreviewToolbar } from "./CodePreviewToolbar";
import type { CodeBlockToolbarProps } from "./codeToolbarTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/CodeBlockToolbar.tsx#messages:1">`
zh-Hans:
  codeActions: "代码操作"
  turnOffLineWrapping: "取消换行"
  wrapLines: "自动换行"
  formatCode: "格式化代码"
  codeCopied: "已复制代码"
  copyCode: "复制代码"
  copied: "已复制"
  moreActions: "更多操作"
  downloadImage: "下载图片"
en:
  codeActions: "Code actions"
  turnOffLineWrapping: "Turn off line wrapping"
  wrapLines: "Wrap lines"
  formatCode: "Format code"
  codeCopied: "Code copied"
  copyCode: "Copy code"
  copied: "Copied"
  moreActions: "More actions"
  downloadImage: "Download image"
ja:
  codeActions: "コード操作"
  turnOffLineWrapping: "折り返しを解除"
  wrapLines: "右端で折り返す"
  formatCode: "コードを整形"
  codeCopied: "コードをコピーしました"
  copyCode: "コードをコピー"
  copied: "コピーしました"
  moreActions: "その他の操作"
  downloadImage: "画像をダウンロード"
`;
const t = createTranslator(messages);
export function CodeBlockToolbar({
  language,
  onLanguageChange,
  getCodeContent,
  onFormat,
  onWrapChange,
  wrap = false,
  editable = true,
  previewMode = "code",
  onPreviewModeChange,
  onOpenPreview,
  onSystemPreview,
  onDownloadPreview,
  onCopyPreview,
  canPreview = false,
}: CodeBlockToolbarProps) {
  useLocale();
  const [copiedKind, setCopiedKind] = useState<"code" | "image" | null>(null);
  const copyKind = previewMode === "preview" && onCopyPreview ? "image" : "code";
  const copied = copiedKind === copyKind;
  const [copyingImage, setCopyingImage] = useState(false);
  const { format, isLoading } = useFormatCode();
  const platform = useEditorPlatform();
  const handleCopyCode = async () => {
    const content = getCodeContent();
    await platform.clipboard.copyText(content);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content).catch(() => undefined);
    }
    setCopiedKind("code");
    setTimeout(() => setCopiedKind(null), 2000);
  };
  const handleCopy = async () => {
    if (previewMode === "preview" && onCopyPreview) {
      if (copyingImage) return;
      setCopyingImage(true);
      try {
        await onCopyPreview();
        setCopiedKind("image");
        setTimeout(() => setCopiedKind(null), 2000);
      } catch {
      } finally {
        setCopyingImage(false);
      }
      return;
    }
    await handleCopyCode();
  };
  const handleFormatClick = async () => {
    if (!onFormat) return;
    const content = getCodeContent();
    if (!content) return;
    const formatted = await format(content, language || "text");
    if (formatted) onFormat(formatted);
  };
  const canFormat = FORMAT_SUPPORTED_LANGUAGES.includes(
    (language || "").toLowerCase(),
  );
  const isMathOrMermaid = language === "math" || language === "mermaid";
  const hasVisualPreview = isMathOrMermaid && Boolean(onPreviewModeChange);
  const showWrap = editable && Boolean(onWrapChange) && !isMathOrMermaid;
  const showFormat = editable && Boolean(onFormat) && canFormat;
  const showHelp = language === "math" && editable;
  const showDownloadInMore = hasVisualPreview;
  const hasMore = showDownloadInMore || showWrap || showFormat;
  const btn = "goose-code-island-btn goose-accent-selection";
  const icon = "goose-code-island-icon";
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={600}>
      <SelectionToolbarSurface
        context="code"
        variant="embedded"
        aria-label={t("codeActions")}
        contentEditable={false}
        className={cn(
          "goose-editor-position-safe-trigger goose-code-toolbar-actions inline-flex items-center",
          hasVisualPreview && "goose-code-toolbar-actions-visual",
        )}
      >
        <div className="goose-code-hover-actions flex shrink-0 items-center">
          {hasVisualPreview && (
            <CodePreviewToolbar
              language={language}
              onLanguageChange={onLanguageChange}
              getCodeContent={getCodeContent}
              canPreview={canPreview}
              onOpenPreview={onOpenPreview}
              onSystemPreview={onSystemPreview}
              onDownloadPreview={onDownloadPreview}
              onCopyPreview={onCopyPreview}
              previewMode={previewMode}
              onPreviewModeChange={onPreviewModeChange}
              copied={copied}
              copyingImage={copyingImage}
              handleCopy={handleCopy}
            />
          )}
          {showWrap && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={wrap ? t("turnOffLineWrapping") : t("wrapLines")}
                  aria-pressed={wrap}
                  data-goose-secondary="true"
                  onClick={() => onWrapChange?.(!wrap)}
                  className={btn}
                >
                  {wrap ? (
                    <GooseIcons.AlignJustify className={icon} />
                  ) : (
                    <GooseIcons.WrapText className={icon} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {wrap ? t("turnOffLineWrapping") : t("wrapLines")}
              </TooltipContent>
            </Tooltip>
          )}
          {showFormat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("formatCode")}
                  data-goose-secondary="true"
                  onClick={handleFormatClick}
                  disabled={isLoading}
                  className={btn}
                >
                  {isLoading ? (
                    <GooseIcons.Loader2 className={cn(icon, "animate-spin")} />
                  ) : (
                    <GooseIcons.Sparkles className={icon} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("formatCode")}</TooltipContent>
            </Tooltip>
          )}
          {!hasVisualPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopyCode()}
                  aria-label={copied ? t("codeCopied") : t("copyCode")}
                  className={btn}
                >
                  {copied ? (
                    <GooseIcons.Check className={cn(icon, "text-[var(--goose-color-success)]")} />
                  ) : (
                    <GooseIcons.Copy className={icon} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{copied ? t("copied") : t("copyCode")}</TooltipContent>
            </Tooltip>
          )}

          {showHelp && <CodeLatexHints />}

          {hasMore && (
            <Popover open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("moreActions")}
                  className={cn(btn, "goose-code-more")}
                >
                  <GooseIcons.MoreHorizontal className={icon} />
                </Button>
              </PopoverTrigger>
              <PopoverContent variant="menu" align="end" className="goose-code-more-menu">
                <div className="goose-list-layout" data-goose-menu-slot="root" role="menu">
                {showDownloadInMore && (
                  <PopoverAction
                    disabled={!canPreview}
                    onSelect={() => {
                      setMoreOpen(false);
                      onDownloadPreview?.();
                    }}
                    role="menuitem"
                    data-goose-menu-slot="row"
                    className="goose-menu-item"
                  >
                    <GooseIcons.Download className={icon} />
                    <span>{t("downloadImage")}</span>
                  </PopoverAction>
                )}
                {showWrap && (
                  <PopoverAction
                    aria-pressed={wrap}
                    onSelect={() => {
                      setMoreOpen(false);
                      onWrapChange?.(!wrap);
                    }}
                    role="menuitem"
                    data-goose-menu-slot="row"
                    className="goose-menu-item"
                  >
                    {wrap ? (
                      <GooseIcons.AlignJustify className={icon} />
                    ) : (
                      <GooseIcons.WrapText className={icon} />
                    )}
                    <span>{wrap ? t("turnOffLineWrapping") : t("wrapLines")}</span>
                  </PopoverAction>
                )}
                {showFormat && (
                  <PopoverAction
                    disabled={isLoading}
                    onSelect={() => {
                      setMoreOpen(false);
                      void handleFormatClick();
                    }}
                    role="menuitem"
                    data-goose-menu-slot="row"
                    className="goose-menu-item"
                  >
                    <GooseIcons.Sparkles className={icon} />
                    <span>{t("formatCode")}</span>
                  </PopoverAction>
                )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </SelectionToolbarSurface>
    </TooltipProvider>
  );
}
