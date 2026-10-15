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
    throw new Error("原文件所在笔记本已不可用，草稿内容已保留");
  }
  const root = normalizePath(notebook.localPath);
  const parent = page.parentId ? get().pages[page.parentId] : undefined;
  const directory = page.parentId ? parent?.localFilePath : notebook.localPath;
  if (page.parentId && (!parent?.isFolder || parent.trashedAt ||
    parent.workspaceId !== page.workspaceId)) {
    throw new Error("原文件所在目录已不存在，草稿内容已保留");
  }
  const target = directory ? normalizePath(directory) : "";
  const insideRoot = target === root || target.startsWith(root === "/" ? "/" : `${root}/`);
  if (!target || !insideRoot || target.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("原文件所在目录已不可用，草稿内容已保留");
  }
  const assignedPath = filePath ?? page.localFilePath;
  if (assignedPath) {
    const normalized = normalizePath(assignedPath);
    const assignedDirectory = normalizePath(normalized.slice(0, normalized.lastIndexOf("/")));
    if (assignedDirectory !== target) {
      throw new Error("原文件所在目录已改变，草稿内容已保留");
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
    throw new Error("原文件所在目录已不可用，草稿内容已保留");
  }
}
