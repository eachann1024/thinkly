import { useNotebooks } from "../../../useNotebooks";
import { useTabs } from "../../../useTabs";
import { transferLocalFolderOrder } from "@/stores/localFolderOrder/transfer";
import { relocateLocalPageTree } from "./rename/directory";
import type { StoreSet, StoreGet } from "../hydrate";

export async function moveLocalPageToNotebookAction(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  targetNotebookId: string,
): Promise<void> {
  const fs = typeof window !== "undefined" ? window.gooseFs : undefined;
  const page = get().pages[pageId];
  const notebooks = useNotebooks.getState();
  const source = page ? notebooks.notebooks[page.workspaceId] : undefined;
  const target = notebooks.notebooks[targetNotebookId];
  if (
    !fs ||
    !page?.localFilePath ||
    page.trashedAt ||
    page.localUnsaved ||
    page.localPendingCreate
  )
    throw new Error("当前文件无法移动");
  if (page.workspaceId === targetNotebookId)
    throw new Error("文件已在当前记事本");
  if (
    source?.source !== "local-folder" ||
    !source.localPath ||
    target?.source !== "local-folder" ||
    !target.localPath ||
    target.localPathMissing
  )
    throw new Error("目标记事本不可用");
  const oldPath = page.localFilePath.replace(/\\/g, "/");
  const targetRoot = target.localPath.replace(/\\/g, "/").replace(/\/$/, "");
  const name = oldPath.slice(oldPath.lastIndexOf("/") + 1);
  const nextPath = `${targetRoot}/${name}`;
  if (source.localPath.replace(/\\/g, "/").replace(/\/$/, "") === targetRoot)
    throw new Error("目标记事本与当前记事本使用同一文件夹");
  if (
    page.isFolder &&
    (targetRoot === oldPath || targetRoot.startsWith(oldPath + "/"))
  )
    throw new Error("不能将目录移到自身的子目录内");
  if (
    !(await (fs.existsAsync
      ? fs.existsAsync(targetRoot)
      : fs.exists(targetRoot)))
  )
    throw new Error("目标记事本文件夹不存在");
  if (await (fs.existsAsync ? fs.existsAsync(nextPath) : fs.exists(nextPath)))
    throw new Error(`目标记事本已存在同名文件：${name}`);
  const moved = Object.values(get().pages).filter((p) => {
    const path = p.localFilePath?.replace(/\\/g, "/");
    return (
      p.workspaceId === page.workspaceId &&
      path &&
      (path === oldPath || (page.isFolder && path.startsWith(oldPath + "/")))
    );
  });
  await relocateLocalPageTree(set, get, pageId, nextPath, {
    workspaceId: targetNotebookId,
    parentId: undefined,
  });
  transferLocalFolderOrder(
    page.workspaceId,
    targetNotebookId,
    pageId,
    page.parentId,
    moved.filter((p) => p.isFolder).map((p) => p.id),
  );
  const movedIds = new Set(moved.map((p) => p.id));
  const lastActive = notebooks.getLastActivePage(page.workspaceId);
  if (lastActive && movedIds.has(lastActive))
    notebooks.setLastActivePage(page.workspaceId, null);
  if (
    get().activePageId &&
    movedIds.has(get().activePageId!) &&
    notebooks.activeNotebookId === page.workspaceId
  ) {
    const fallback = Object.values(get().pages).find(
      (p) => p.workspaceId === page.workspaceId && !p.isFolder && !p.trashedAt,
    );
    get().setActivePage(fallback?.id ?? null);
    if (fallback) useTabs.getState().syncActiveTabForPage(fallback.id);
  }
}
