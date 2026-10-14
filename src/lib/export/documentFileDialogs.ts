import { getGooseDesktop, isElectronRuntime } from "@/lib/electron/runtime";
import { sanitizeFilenameSegment } from "@/lib/local-title-binding";
import type { OpenFileDialogOptions } from "@/lib/native-dialog-contract";

type FileFilters = NonNullable<OpenFileDialogOptions["filters"]>;

/** 文档导入统一使用主进程选择器，让不同导入入口共享已确认的目录。 */
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
  if (isElectronRuntime()) throw new Error("无法打开文件选择器，请重新启动桌面应用");

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

/** 取消返回 false；写盘失败抛错，禁止将取消或错误降级为自动下载。 */
export async function saveDocumentBlobAndReveal(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const desktop = getGooseDesktop();
  if (!desktop) throw new Error("无法打开保存对话框，请重新启动桌面应用");
  const suffix = filename.match(/(\.[a-z0-9]{1,12})$/i)?.[1] || "";
  const stem = suffix ? filename.slice(0, -suffix.length) : filename;
  const safeName = `${sanitizeFilenameSegment(stem) || "untitled"}${suffix}`;
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
