import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/create/validateEditorDraftTarget.ts#block1:1">`
zh-Hans:
  draftNotebookUnavailable: "原文件所在笔记本已不可用，草稿内容已保留"
  draftFolderMissing: "原文件所在目录已不存在，草稿内容已保留"
  draftFolderUnavailable: "原文件所在目录已不可用，草稿内容已保留"
  draftFolderChanged: "原文件所在目录已改变，草稿内容已保留"
en:
  draftNotebookUnavailable: "The original notebook is no longer available. Your draft was preserved."
  draftFolderMissing: "The original folder no longer exists. Your draft was preserved."
  draftFolderUnavailable: "The original folder is no longer available. Your draft was preserved."
  draftFolderChanged: "The original folder has changed. Your draft was preserved."
`);
import type { StoreGet } from "../hydrate";
import { useNotebooks } from "../../../useNotebooks";

const normalizePath = (path: string) =>
  path.replace(/\\/g, "/").replace(/\/+$/, "") || "/";

function resolveDraftDirectory(
  get: StoreGet,
  pageId: string,
  filePath?: string,
): string | null {
  const page = get().pages[pageId];
  if (!page?.editorDraft) return null;
  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  if (notebook?.source !== "local-folder" || !notebook.localPath) {
    throw new Error(storeText("draftNotebookUnavailable"));
  }
  const root = normalizePath(notebook.localPath);
  const parent = page.parentId ? get().pages[page.parentId] : undefined;
  const directory = page.parentId ? parent?.localFilePath : notebook.localPath;
  if (page.parentId && (!parent?.isFolder || parent.trashedAt ||
    parent.workspaceId !== page.workspaceId)) {
    throw new Error(storeText("draftFolderMissing"));
  }
  const target = directory ? normalizePath(directory) : "";
  const insideRoot = target === root || target.startsWith(root === "/" ? "/" : `${root}/`);
  if (!target || !insideRoot || target.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error(storeText("draftFolderUnavailable"));
  }
  const assignedPath = filePath ?? page.localFilePath;
  if (assignedPath) {
    const normalized = normalizePath(assignedPath);
    const assignedDirectory = normalizePath(normalized.slice(0, normalized.lastIndexOf("/")));
    if (assignedDirectory !== target) {
      throw new Error(storeText("draftFolderChanged"));
    }
  }
  return target;
}

/** 首次写盘失败后仍是草稿，重试时也不能重建已删除的原目录。 */
export async function validateEditorDraftTarget(
  get: StoreGet,
  pageId: string,
  filePath?: string,
): Promise<void> {
  const directory = resolveDraftDirectory(get, pageId, filePath);
  if (!directory) return;
  const fs = typeof window === "undefined" ? undefined : window.gooseFs;
  const desktop = typeof window === "undefined" ? undefined : window.gooseDesktop;
  let available = false;
  try {
    available = desktop?.fsStat
      ? (await desktop.fsStat(directory)).isDirectory
      : Boolean(fs?.existsAsync ? await fs.existsAsync(directory) : fs?.exists(directory));
  } catch {
    // 目录不可读取时保留草稿，交给现有保存失败提示处理。
  }
  if (!available || resolveDraftDirectory(get, pageId, filePath) !== directory) {
    throw new Error(storeText("draftFolderUnavailable"));
  }
}
