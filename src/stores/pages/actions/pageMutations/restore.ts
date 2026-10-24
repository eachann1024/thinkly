import { runWithPresence } from "@/lib/ui/presence";
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/pageMutations/restore.ts#block1:1">`
zh-Hans:
  unnamedNotebook: "未命名笔记本"
  untitled: "无标题"
  folder: "文件夹"
  file: "文件"
  page: "页面"
en:
  unnamedNotebook: "Unnamed notebook"
  untitled: "Untitled"
  folder: "Folder"
  file: "File"
  page: "Page"
ja:
  unnamedNotebook: "名称未設定のノートブック"
  untitled: "無題"
  folder: "フォルダ"
  file: "ファイル"
  page: "ページ"
`);
import type { Page } from "@/types";
import { useNotebooks } from "../../../useNotebooks";
import type { StoreSet, StoreGet } from "../hydrate";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { persistPageSnapshots } from "../../persistence";

export const restorePageAction = (
  set: StoreSet,
  get: StoreGet,
  id: string,
): {
  ok: boolean;
  pageTitle?: string;
  notebookName?: string;
  parentTitles?: string[];
  restoredCount?: number;
  itemLabel?: string;
} => {
  const snapshotPages = get().pages;
  const page = snapshotPages[id];
  if (!page || !page.trashedAt) {
    return { ok: false };
  }

  const notebookName =
    useNotebooks.getState().notebooks[page.workspaceId]?.name ||
    storeText("unnamedNotebook");
  const pageTitle = getPageTitle(page) || storeText("untitled");
  const itemLabel = page.isFolder
    ? storeText("folder")
    : page.localFilePath
      ? storeText("file")
      : storeText("page");

  const parentTitles: string[] = [];
  const parentVisited = new Set<string>();
  let currentParentId = page.parentId;
  while (currentParentId && !parentVisited.has(currentParentId)) {
    parentVisited.add(currentParentId);
    const parentPage = snapshotPages[currentParentId];
    if (!parentPage) break;
    parentTitles.unshift(getPageTitle(parentPage) || storeText("untitled"));
    currentParentId = parentPage.parentId;
  }

  let restoredCount = 0;
  const restoredIds: string[] = [];
  runWithPresence(() => set((state) => {
    const currentPage = state.pages[id];
    if (!currentPage || !currentPage.trashedAt) return state;

    const trashStamp = currentPage.trashedAt;
    const batchId = currentPage.trashBatchId;
    const now = Date.now();
    const restoredPages = { ...state.pages };

    const stack = [id];
    const visited = new Set<string>();
    while (stack.length) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = restoredPages[currentId];
      const matched =
        current?.trashBatchId !== undefined
          ? current.trashBatchId === batchId
          : current?.trashedAt === trashStamp;
      if (current && matched) {
        const { trashedAt, trashBatchId, ...rest } = current;
        restoredPages[currentId] = {
          ...rest,
          updatedAt: now,
        } as Page;
        restoredCount += 1;
        restoredIds.push(currentId);
      }
      Object.values(restoredPages).forEach((p) => {
        if (p.parentId === currentId && !visited.has(p.id)) {
          stack.push(p.id);
        }
      });
    }

    return {
      pages: restoredPages,
    };
  }));

  persistPageSnapshots(get().pages, restoredIds);

  return {
    ok: true,
    pageTitle,
    notebookName,
    parentTitles,
    restoredCount,
    itemLabel,
  };
};
