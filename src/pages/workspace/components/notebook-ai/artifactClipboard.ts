import { toast } from "@/components/ui/sonner";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { getEditorPlatform } from "@/components/editor/platform/context";
import { shell } from "@/lib/electron-platform/shell";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/artifactClipboard.ts#messages:1">`
zh-Hans:
  copied: "已复制"
  saved: "已保存"
  saveFailed: "保存失败"
  imageEncodingFailed: "图片编码失败"
  copiedToClipboard: "已复制到剪贴板"
en:
  copied: "Copied"
  saved: "Saved"
  saveFailed: "Save failed"
  imageEncodingFailed: "Image encoding failed"
  copiedToClipboard: "Copied to clipboard"
ja:
  copied: "コピーしました"
  saved: "保存しました"
  saveFailed: "保存に失敗しました"
  imageEncodingFailed: "画像のエンコードに失敗しました"
  copiedToClipboard: "クリップボードにコピーしました"
`;
const t = createTranslator(messages);

export async function copyText(text: string) {
  try {
    await navigator.clipboard?.writeText(text);
    toast.success(t("copied"));
    return;
  } catch {
    shell.copyText(text);
    toast.success(t("copied"));
  }
}

export async function downloadText(
  text: string,
  filename: string,
  mimeType: string,
) {
  try {
    const blob = new Blob([text], { type: mimeType });
    await saveBlobAndReveal(blob, filename);
    toast.success(t("saved"));
  } catch {
    toast.error(t("saveFailed"));
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(t("imageEncodingFailed")));
    };
    reader.onerror = () => reject(new Error(t("imageEncodingFailed")));
    reader.readAsDataURL(blob);
  });
}

export async function copyImagePayload(payload: string | Blob) {
  const dataUrl =
    typeof payload === "string" ? payload : await blobToDataUrl(payload);
  await getEditorPlatform().clipboard.copyImage(dataUrl);
  toast.success(t("copiedToClipboard"));
}
