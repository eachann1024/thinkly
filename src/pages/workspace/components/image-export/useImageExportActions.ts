import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/useImageExportActions.ts#localMessages:1">`
zh-Hans:
  copied: "已复制到剪贴板"
  saved: "已保存 {{name}}"
  revealFinder: "在访达中显示"
  revealFiles: "在文件管理器中显示"
  imageFailed: "有 {{count}} 张图片没能载入，已跳过后可重试"
  exportFailed: "生成失败，请重试"
en:
  copied: "Copied to the clipboard"
  saved: "Saved {{name}}"
  revealFinder: "Show in Finder"
  revealFiles: "Show in file manager"
  imageFailed: "{{count}} image(s) failed to load. Skipped — you can retry."
  exportFailed: "Couldn’t generate the image. Try again."
ja:
  copied: "クリップボードにコピーしました"
  saved: "{{name}} を保存しました"
  revealFinder: "Finder で表示"
  revealFiles: "ファイルマネージャで表示"
  imageFailed: "{{count}} 枚の画像を読み込めませんでした。スキップしたので再試行できます"
  exportFailed: "生成に失敗しました。もう一度お試しください"
`;
const uiText = createTranslator(localMessages);
import { useLayoutEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { saveDocumentBlob } from "@/lib/export/documentFileDialogs";
import { editorPlatform } from "@/lib/editor-platform/resolve";
import { ImageExportLoadError } from "@/lib/imageExport/capture/captureElement";
import { renderImageExportBlob } from "@/lib/imageExport/renderBlob";
import { getPlatformKind } from "@/lib/utils";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import {
  activeImageExportThemeId,
  type ImageExportAction,
  useImageExportView,
} from "@/stores/useImageExportView";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function perform(action: ImageExportAction) {
  const state = useImageExportView.getState();
  if (state.busy || !state.active) return;
  const empty = state.scope === "selection" && state.blocks.length === 0;
  if (empty || state.ratio === 0) return;
  const { scope, blocks, width, selectionTheme, active } = state;
  const page = usePages.getState().pages[active];
  if (!page) return;
  const settings = useSettings.getState();
  const themeId = activeImageExportThemeId(
    scope,
    selectionTheme,
    settings.imageExportThemeId,
  );
  useImageExportView.getState().setBusy(true);
  try {
    const { blob, filename } = await renderImageExportBlob({
      page,
      blocks: scope === "selection" ? blocks : page.content,
      themeId,
      watermarkConfig: settings.imageExportWatermark,
      mode: scope,
      contentWidth: width,
    });
    if (useImageExportView.getState().active !== active) return;
    if (action === "copy") {
      await editorPlatform.clipboard.copyImage(await blobToDataUrl(blob));
      toast.success(uiText("copied"));
      return;
    }
    const path = await saveDocumentBlob(blob, filename);
    if (!path) return;
    const name = path.split(/[\\/]/).pop() || filename;
    toast.success(uiText("saved", { name }), {
      action: {
        label: getPlatformKind() === "mac" ? uiText("revealFinder") : uiText("revealFiles"),
        onClick: () => {
          void editorPlatform.fs.revealItemInFolder(path);
        },
      },
    });
  } catch (error) {
    if (useImageExportView.getState().active !== active) return;
    console.error("[imageExport] export failed:", error);
    toast.error(
      error instanceof ImageExportLoadError
        ? uiText("imageFailed", { count: error.count })
        : uiText("exportFailed"),
    );
  } finally {
    if (useImageExportView.getState().active === active) {
      useImageExportView.getState().setBusy(false);
    }
  }
}

export function useImageExportActions(pageId: string) {
  useLayoutEffect(() => {
    useImageExportView.getState().setRun((action) => {
      void perform(action);
    });
    return () => useImageExportView.getState().setRun(null);
  }, [pageId]);
}
