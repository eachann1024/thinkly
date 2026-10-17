import { useLocale } from "@/i18n";
import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";
import { IconButton } from "@/components/ui/icon-button";
import { copyText, downloadText, copyImagePayload } from "./artifactClipboard";
import { useState } from "react";
import {
  Copy,
  Download,
  FilePlus2,
  Image as ImageIcon,
  Loader2,
  Maximize2,
} from "@/components/ui/icons";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FullscreenPreview } from "@/components/preview/FullscreenPreview";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import {
  getPreviewActionTooltip,
} from "@/lib/preview/previewAction";
import { useArtifactPreview } from "./useArtifactPreview";
import type { ArtifactActionsProps } from "./artifactActionTypes";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ArtifactActions.tsx#messages:1">`
zh-Hans:
  copyImage: "复制图片"
  unknownError: "未知错误"
  copySource: "复制源码"
  insertIntoCurrentNote: "插入当前笔记"
  insertedIntoCurrentNote: "已插入当前笔记"
  downloadImage: "下载图片"
  saved: "已保存"
  download: "下载"
  detailCopyFailed: "复制失败：{{value1}}"
  detailDownloadFailed: "下载失败：{{value1}}"
en:
  copyImage: "Copy image"
  unknownError: "Unknown error"
  copySource: "Copy source"
  insertIntoCurrentNote: "Insert into current note"
  insertedIntoCurrentNote: "Inserted into current note"
  downloadImage: "Download image"
  saved: "Saved"
  download: "Download"
  detailCopyFailed: "Copy failed: {{value1}}"
  detailDownloadFailed: "Download failed: {{value1}}"
ja:
  copyImage: "画像をコピー"
  unknownError: "不明なエラー"
  copySource: "ソースをコピー"
  insertIntoCurrentNote: "現在のノートに挿入"
  insertedIntoCurrentNote: "現在のノートに挿入しました"
  downloadImage: "画像をダウンロード"
  saved: "保存しました"
  download: "ダウンロード"
  detailCopyFailed: "コピーに失敗しました：{{value1}}"
  detailDownloadFailed: "ダウンロードに失敗しました：{{value1}}"
`;
const t = createTranslator(messages);


const iconBtnClass = "cursor-pointer";

export function ArtifactActions({
  copySource,
  downloadSource,
  filename = "artifact.txt",
  mimeType = "text/plain;charset=utf-8",
  onCopyImage,
  onDownloadImage,
  downloadImageFilename = "artifact.png",
  onPreview,
  onPreviewImage,
  previewFilename = "preview.png",
  previewIdentity,
  onInsert,
}: ArtifactActionsProps) {
  useLocale();
  const [copyingImage, setCopyingImage] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const { previewing, previewContent, closePreview, previewHandlers } = useArtifactPreview({
    onPreview, onPreviewImage, previewFilename,
    identity: previewIdentity ?? JSON.stringify([copySource, downloadSource, filename, previewFilename]),
  });

  const hasSourceCopy = Boolean(copySource?.trim());
  const hasImageCopy = Boolean(onCopyImage);
  const hasImageDownload = Boolean(onDownloadImage);
  const hasSourceDownload =
    Boolean(downloadSource?.trim()) && !hasImageDownload;
  const hasPreview = Boolean(onPreview || onPreviewImage);

  if (
    !hasSourceCopy &&
    !hasImageCopy &&
    !hasImageDownload &&
    !hasSourceDownload &&
    !hasPreview &&
    !onInsert
  ) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="notebook-ai-artifact-actions flex shrink-0 items-center gap-0.5">
        {hasImageCopy ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                aria-label={t("copyImage")}
                disabled={copyingImage}
                onClick={() => {
                  if (!onCopyImage || copyingImage) return;
                  setCopyingImage(true);
                  void (async () => {
                    try {
                      const payload = await onCopyImage();
                      await copyImagePayload(payload);
                    } catch (err) {
                      toast.error(
                        t("detailCopyFailed", { value1: err instanceof Error ? localizeNotebookAiDiagnostic(err.message) : t("unknownError") }),
                      );
                    } finally {
                      setCopyingImage(false);
                    }
                  })();
                }}
              >
                {copyingImage ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.75}
                  />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("copyImage")}</TooltipContent>
          </Tooltip>
        ) : null}

        {hasSourceCopy ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                aria-label={t("copySource")}
                onClick={() => void copyText(copySource!)}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("copySource")}</TooltipContent>
          </Tooltip>
        ) : null}

        {onInsert ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                aria-label={t("insertIntoCurrentNote")}
                onClick={async () => {
                  const result = await onInsert();
                  toast[result.ok ? "success" : "error"](
                    result.ok ? t("insertedIntoCurrentNote") : result.error,
                  );
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{t("insertIntoCurrentNote")}</TooltipContent>
          </Tooltip>
        ) : null}

        {hasPreview ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                disabled={previewing}
                {...previewHandlers}
              >
                {previewing ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.75}
                  />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{getPreviewActionTooltip()}</TooltipContent>
          </Tooltip>
        ) : null}

        {hasImageDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="notebook-ai-canvas-card-download h-7 gap-1 px-2 text-xs text-muted-foreground"
            aria-label={t("downloadImage")}
            disabled={downloadingImage}
            onClick={() => {
              if (!onDownloadImage || downloadingImage) return;
              setDownloadingImage(true);
              void (async () => {
                try {
                  const blob = await onDownloadImage();
                  await saveBlobAndReveal(blob, downloadImageFilename);
                  toast.success(t("saved"));
                } catch (err) {
                  toast.error(
                    t("detailDownloadFailed", { value1: err instanceof Error ? localizeNotebookAiDiagnostic(err.message) : t("unknownError") }),
                  );
                } finally {
                  setDownloadingImage(false);
                }
              })();
            }}
          >
            {downloadingImage ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                strokeWidth={1.75}
              />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {t("download")}
          </Button>
        ) : hasSourceDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="notebook-ai-canvas-card-download h-7 gap-1 px-2 text-xs text-muted-foreground"
            aria-label={t("download")}
            onClick={() =>
              void downloadText(downloadSource!, filename, mimeType)
            }
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("download")}
          </Button>
        ) : null}
      </div>
      <FullscreenPreview
        open={Boolean(previewContent)}
        content={previewContent}
        onClose={closePreview}
      />
    </TooltipProvider>
  );
}
