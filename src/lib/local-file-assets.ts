import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { isPathInsideNotebookRoot } from "@/lib/currentLocalPagePath";
import { guessMime } from "@/lib/imageStorage/strategies/fileMime";
import { createTranslator, i18nYaml } from "@/i18n/core";
import {
  MAX_LOCAL_ASSET_BYTES,
  getLocalAssetKindForFile,
  type LocalAssetTarget,
  type LocalAssetKind,
  type SavedLocalAssetPath,
} from "./local-file-asset-contract";
export * from "./local-file-asset-contract";

const t = createTranslator(i18nYaml<"src/lib/local-file-assets.ts#block1:1">`
zh-Hans:
  unavailable: "当前笔记无法保存附件"
  empty: "不能导入空文件或文件夹"
  tooLarge: "单个文件不能超过 256 MiB"
  copyFailed: "文件复制失败，请检查文件夹权限和可用空间"
en:
  unavailable: "This note cannot save attachments"
  empty: "Empty files and folders cannot be imported"
  tooLarge: "Each file must be 256 MiB or smaller"
  copyFailed: "Could not copy the file. Check folder permissions and available space."
ja:
  unavailable: "このノートには添付ファイルを保存できません"
  empty: "空のファイルやフォルダは読み込めません"
  tooLarge: "各ファイルは256 MiB以下にしてください"
  copyFailed: "ファイルをコピーできません。フォルダのアクセス権と空き容量を確認してください。"
`);

export function captureLocalAssetTarget(pageId: string): LocalAssetTarget | null {
  const page = usePages.getState().pages[pageId];
  const notebook = page && useNotebooks.getState().notebooks[page.workspaceId];
  if (!page?.localFilePath || page.isFolder || page.isLocked || page.trashedAt ||
      page.localUnsaved || page.localPendingCreate || notebook?.source !== "local-folder" ||
      !notebook.localPath || notebook.localPathMissing) return null;
  return { pageId, workspaceId: page.workspaceId, pageLocalFilePath: page.localFilePath, notebookRoot: notebook.localPath };
}

export function isLocalAssetTargetCurrent(target: LocalAssetTarget): boolean {
  if (!isPathInsideNotebookRoot(target.pageLocalFilePath, target.notebookRoot)) return false;
  if (target.workspaceId) {
    const notebook = useNotebooks.getState().notebooks[target.workspaceId];
    if (notebook?.source !== "local-folder" || notebook.localPathMissing || notebook.localPath !== target.notebookRoot) return false;
  }
  if (!target.pageId) return true;
  const current = captureLocalAssetTarget(target.pageId);
  return Boolean(current && current.pageLocalFilePath === target.pageLocalFilePath &&
    current.notebookRoot === target.notebookRoot && current.workspaceId === target.workspaceId);
}

export interface SavedLocalAsset extends SavedLocalAssetPath {
  name: string;
  mimeType: string;
  size: number;
  kind: LocalAssetKind;
}

export async function saveLocalAsset(file: File, target: LocalAssetTarget): Promise<SavedLocalAsset> {
  if (!file.size) throw new Error(t("empty"));
  if (file.size > MAX_LOCAL_ASSET_BYTES) throw new Error(t("tooLarge"));
  const api = getGooseDesktop();
  if (!api?.fsSaveAsset || !isLocalAssetTargetCurrent(target)) throw new Error(t("unavailable"));
  const data = new Uint8Array(await file.arrayBuffer());
  if (!isLocalAssetTargetCurrent(target)) throw new Error(t("unavailable"));
  const saved = await api.fsSaveAsset({
    pageLocalFilePath: target.pageLocalFilePath,
    notebookRoot: target.notebookRoot,
    name: file.name,
    data,
  }).catch((error: unknown) => { throw new Error(t("copyFailed"), { cause: error }); });
  return { ...saved, name: file.name, mimeType: file.type || guessMime(file.name), size: file.size, kind: getLocalAssetKindForFile(file) };
}

export async function discardSavedLocalAsset(asset: SavedLocalAssetPath): Promise<void> {
  await getGooseDesktop()?.fsRemove(asset.absolutePath);
}
