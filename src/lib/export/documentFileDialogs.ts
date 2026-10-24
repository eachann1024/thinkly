import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/export/documentFileDialogs.ts#localMessages:1">`
zh-Hans:
  couldnTOpenTheFilePickerRestartTheDesktop: "无法打开文件选择器，请重新启动桌面应用"
  couldnTOpenTheSaveDialogRestartTheDesktop: "无法打开保存对话框，请重新启动桌面应用"
en:
  couldnTOpenTheFilePickerRestartTheDesktop: "Couldn’t open the file picker. Restart the desktop app."
  couldnTOpenTheSaveDialogRestartTheDesktop: "Couldn’t open the save dialog. Restart the desktop app."
ja:
  couldnTOpenTheFilePickerRestartTheDesktop: "ファイル選択ダイアログを開けませんでした。デスクトップアプリを再起動してください"
  couldnTOpenTheSaveDialogRestartTheDesktop: "保存ダイアログを開けませんでした。デスクトップアプリを再起動してください"
`;
const uiText = createTranslator(localMessages);
import { getGooseDesktop, isElectronRuntime } from "@/lib/electron/runtime";
import { clampFilename } from "@/lib/filenameLimits";
import { sanitizeFilenameSegment } from "@/lib/local-title-binding";
import type { OpenFileDialogOptions } from "@/lib/native-dialog-contract";

type FileFilters = NonNullable<OpenFileDialogOptions["filters"]>;

export async function pickImportFile(filters: FileFilters): Promise<File | null> {
  const desktop = getGooseDesktop();
  if (desktop) {
    const paths = await desktop.showOpenDialog({ filters, multiple: false });
    const path = paths?.[0];
    if (!path) return null;
    const bytes = new Uint8Array(await desktop.fsRead(path));
    const name = path.split(/[\\/]/).pop() || "import";
    return new File([bytes], name);
  }
  if (isElectronRuntime()) throw new Error(uiText("couldnTOpenTheFilePickerRestartTheDesktop"));

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = filters.flatMap(({ extensions }) =>
      extensions.map((extension) => `.${extension}`),
    ).join(",");
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });
}

export async function saveDocumentBlobAndReveal(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const desktop = getGooseDesktop();
  if (!desktop) throw new Error(uiText("couldnTOpenTheSaveDialogRestartTheDesktop"));
  const suffix = filename.match(/(\.[a-z0-9]{1,12})$/i)?.[1] || "";
  const stem = suffix ? filename.slice(0, -suffix.length) : filename;
  const safeName = clampFilename(`${sanitizeFilenameSegment(stem) || "untitled"}${suffix}`);
  const extension = suffix.slice(1).toLowerCase();
  const path = await desktop.showSaveDialog({
    defaultPath: safeName,
    filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
  });
  if (!path) return false;

  await desktop.fsWrite(path, new Uint8Array(await blob.arrayBuffer()));
  try {
    await desktop.showItemInFolder(path);
  } catch (error) {
    console.warn("[export] 文件已保存，但无法在文件管理器中显示:", error);
  }
  return true;
}
