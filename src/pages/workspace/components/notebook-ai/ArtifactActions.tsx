import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { Copy, Download, FilePlus2, Image, Maximize2 } from "@/components/ui/icons";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FullscreenPreview } from "@/components/preview/FullscreenPreview";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { getPreviewActionTooltip } from "@/lib/preview/previewAction";
import { toast } from "@/components/ui/sonner";
import { copyText, downloadText, copyImagePayload } from "./artifactClipboard";
import { useArtifactPreview } from "./useArtifactPreview";
import { useArtifactAction } from "./useArtifactAction";
import { ArtifactActionButton } from "./ArtifactActionButton";
import type { ArtifactActionsProps } from "./artifactActionTypes";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ArtifactActions.tsx#messages:1">`
zh-Hans:
  working: "处理中"
  succeeded: "已完成"
  failed: "失败，点击重试"
  saveFailed: "保存失败"
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
  working: "Working"
  succeeded: "Done"
  failed: "Failed, click to retry"
  saveFailed: "Save failed"
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
  working: "処理中"
  succeeded: "完了"
  failed: "失敗、クリックして再試行"
  saveFailed: "保存に失敗しました"
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

export function ArtifactActions({
  copySource, downloadSource, filename = "artifact.txt", mimeType = "text/plain;charset=utf-8",
  onCopyImage, onDownloadImage, downloadImageFilename = "artifact.png", onPreview, onPreviewImage,
  previewFilename = "preview.png", previewIdentity, onInsert, imageReady = true, insertReady = true,
}: ArtifactActionsProps) {
  useLocale();
  const identity = previewIdentity ?? JSON.stringify([copySource, downloadSource, filename, previewFilename]);
  const { states, run } = useArtifactAction(identity);
  const { previewing, previewFailed, previewContent, closePreview, previewHandlers } = useArtifactPreview({
    onPreview, onPreviewImage, previewFilename, identity,
  });
  const feedback = (id: string) => states[id] === "busy" ? t("working") :
    states[id] === "success" ? t("succeeded") : states[id] === "error" ? t("failed") : undefined;
  const action = (id: string, label: string, fn: () => Promise<unknown>) => ({
    state: states[id], feedback: feedback(id), onClick: () => run(id, label, fn),
  });
  const hasSourceCopy = Boolean(copySource?.trim());
  const hasSourceDownload = Boolean(downloadSource?.trim()) && !onDownloadImage;
  const hasPreview = Boolean(onPreview || onPreviewImage);
  if (!hasSourceCopy && !onCopyImage && !onDownloadImage && !hasSourceDownload && !hasPreview && !onInsert) return null;
  return <TooltipProvider delayDuration={300}>
    <div className="notebook-ai-artifact-actions flex shrink-0 items-center gap-0.5" role="group">
      {onCopyImage ? <ArtifactActionButton icon={Image} label={t("copyImage")} disabled={!imageReady}
        {...action("image", t("copyImage"), async () => copyImagePayload(await onCopyImage()))} /> : null}
      {hasSourceCopy ? <ArtifactActionButton icon={Copy} label={t("copySource")}
        {...action("source", t("copySource"), async () => copyText(copySource!))} /> : null}
      {onInsert ? <ArtifactActionButton icon={FilePlus2} label={t("insertIntoCurrentNote")} disabled={!insertReady}
        {...action("insert", t("insertIntoCurrentNote"), async () => {
          const result = await onInsert();
          if (!result.ok) throw new Error(result.error);
          toast.success(t("insertedIntoCurrentNote"));
        })} /> : null}
      {hasPreview ? <ArtifactActionButton icon={Maximize2} label={getPreviewActionTooltip()}
        {...previewHandlers} active={Boolean(previewContent)} disabled={!imageReady || previewing}
        state={previewing ? "busy" : previewFailed ? "error" : "idle"}
        feedback={previewing ? t("working") : previewFailed ? t("failed") : undefined} /> : null}
      {onDownloadImage || hasSourceDownload ? <ArtifactActionButton icon={Download} label={onDownloadImage ? t("downloadImage") : t("download")}
        disabled={Boolean(onDownloadImage) && !imageReady}
        {...action("download", t("download"), async () => {
          if (onDownloadImage) {
            if (!await saveBlobAndReveal(await onDownloadImage(), downloadImageFilename)) throw new Error(t("saveFailed"));
            toast.success(t("saved"));
          } else await downloadText(downloadSource!, filename, mimeType);
        })} /> : null}
    </div>
    <FullscreenPreview open={Boolean(previewContent)} content={previewContent} onClose={closePreview} />
  </TooltipProvider>;
}
