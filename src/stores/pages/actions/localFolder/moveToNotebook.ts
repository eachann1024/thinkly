import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/moveToNotebook.ts#block1:1">`
zh-Hans:
  nameExists: "目标笔记本已存在同名文件：{{name}}"
en:
  nameExists: "A file named {{name}} already exists in the destination notebook."
ja:
  nameExists: "移動先のノートブックに同名のファイルが既にあります：{{name}}"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/moveToNotebook.ts#block2:2">`
zh-Hans:
  cannotMove: "当前文件无法移动"
  sameNotebook: "文件已在当前笔记本"
  targetUnavailable: "目标笔记本不可用"
  sameFolder: "目标笔记本与当前笔记本使用同一文件夹"
  moveIntoSelf: "不能将目录移到自身的子目录内"
  targetNotebookFolderMissing: "目标笔记本文件夹不存在"
en:
  cannotMove: "This file can’t be moved."
  sameNotebook: "The file is already in this notebook."
  targetUnavailable: "The destination notebook is unavailable."
  sameFolder: "The destination and current notebooks use the same folder."
  moveIntoSelf: "A folder can’t be moved into one of its own subfolders."
  targetNotebookFolderMissing: "The destination notebook’s folder does not exist."
ja:
  cannotMove: "このファイルは移動できません"
  sameNotebook: "ファイルは既にこのノートブックにあります"
  targetUnavailable: "移動先のノートブックを利用できません"
  sameFolder: "移動先のノートブックは現在のノートブックと同じフォルダを使用しています"
  moveIntoSelf: "フォルダを自身のサブフォルダに移動することはできません"
  targetNotebookFolderMissing: "移動先ノートブックのフォルダが存在しません"
`);
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
    throw new Error(storeText("cannotMove"));
  if (page.workspaceId === targetNotebookId)
    throw new Error(storeText("sameNotebook"));
  if (
    source?.source !== "local-folder" ||
    !source.localPath ||
    target?.source !== "local-folder" ||
    !target.localPath ||
    target.localPathMissing
  )
    throw new Error(storeText("targetUnavailable"));
  const oldPath = page.localFilePath.replace(/\\/g, "/");
  const targetRoot = target.localPath.replace(/\\/g, "/").replace(/\/$/, "");
  const name = oldPath.slice(oldPath.lastIndexOf("/") + 1);
  const nextPath = `${targetRoot}/${name}`;
  if (source.localPath.replace(/\\/g, "/").replace(/\/$/, "") === targetRoot)
    throw new Error(storeText("sameFolder"));
  if (
    page.isFolder &&
    (targetRoot === oldPath || targetRoot.startsWith(oldPath + "/"))
  )
    throw new Error(storeText("moveIntoSelf"));
  if (
    !(await (fs.existsAsync
      ? fs.existsAsync(targetRoot)
      : fs.exists(targetRoot)))
  )
    throw new Error(storeText("targetNotebookFolderMissing"));
  if (await (fs.existsAsync ? fs.existsAsync(nextPath) : fs.exists(nextPath)))
    throw new Error(extraText("nameExists", { name }));
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
