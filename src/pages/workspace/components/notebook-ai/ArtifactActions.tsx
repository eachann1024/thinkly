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
  PREVIEW_ACTION_TOOLTIP,
} from "@/lib/preview/previewAction";
import { useArtifactPreview } from "./useArtifactPreview";
import type { ArtifactActionsProps } from "./artifactActionTypes";

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
                aria-label="复制图片"
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
                        `复制失败：${err instanceof Error ? err.message : "未知错误"}`,
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
            <TooltipContent>复制图片</TooltipContent>
          </Tooltip>
        ) : null}

        {hasSourceCopy ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                aria-label="复制源码"
                onClick={() => void copyText(copySource!)}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>复制源码</TooltipContent>
          </Tooltip>
        ) : null}

        {onInsert ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton type="button" size="sm" tone="muted"
                className={iconBtnClass}
                aria-label="插入当前笔记"
                onClick={async () => {
                  const result = await onInsert();
                  toast[result.ok ? "success" : "error"](
                    result.ok ? "已插入当前笔记" : result.error,
                  );
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>插入当前笔记</TooltipContent>
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
            <TooltipContent>{PREVIEW_ACTION_TOOLTIP}</TooltipContent>
          </Tooltip>
        ) : null}

        {hasImageDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="notebook-ai-canvas-card-download h-7 gap-1 px-2 text-xs text-muted-foreground"
            aria-label="下载图片"
            disabled={downloadingImage}
            onClick={() => {
              if (!onDownloadImage || downloadingImage) return;
              setDownloadingImage(true);
              void (async () => {
                try {
                  const blob = await onDownloadImage();
                  await saveBlobAndReveal(blob, downloadImageFilename);
                  toast.success("已保存");
                } catch (err) {
                  toast.error(
                    `下载失败：${err instanceof Error ? err.message : "未知错误"}`,
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
            下载
          </Button>
        ) : hasSourceDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="notebook-ai-canvas-card-download h-7 gap-1 px-2 text-xs text-muted-foreground"
            aria-label="下载"
            onClick={() =>
              void downloadText(downloadSource!, filename, mimeType)
            }
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            下载
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
