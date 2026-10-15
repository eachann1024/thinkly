import type { NotebooksState, Notebook } from "./types";
import { generateId, nextNotebookOrder } from "./types";
import { usePages } from "../usePages";
import {
  localPathsAreCaseInsensitive,
  comparisonLocalPath,
} from "@/lib/canonicalLocalPath";

export function createCreateNotebookActions(
  set: import("zustand").StoreApi<NotebooksState>["setState"],
  get: import("zustand").StoreApi<NotebooksState>["getState"],
): Pick<NotebooksState, "createNotebook" | "createLocalFolderNotebook"> {
  return {
    // 内置笔记本只保留恢复数据格式，不再提供新建入口。
    createNotebook: () => "",

    createLocalFolderNotebook: (name, localPath) => {
      const pagesStore = usePages.getState();
      const caseInsensitive = localPathsAreCaseInsensitive();
      const targetPath = comparisonLocalPath(localPath, caseInsensitive);
      const existing = Object.values(get().notebooks).find(
        (notebook) =>
          notebook.source === "local-folder" &&
          typeof notebook.localPath === "string" &&
          comparisonLocalPath(notebook.localPath, caseInsensitive) ===
            targetPath,
      );
      if (existing) {
        set((state) => ({
          notebooks: {
            ...state.notebooks,
            [existing.id]: {
              ...existing,
              name,
              localPathMissing: false,
              updatedAt: Date.now(),
            },
          },
          activeNotebookId: existing.id,
        }));
        const lastActivePageId = get().lastActivePageByNotebook[existing.id];
        const lastActivePage = lastActivePageId
          ? pagesStore.pages[lastActivePageId]
          : undefined;
        void pagesStore.setActivePage(
          lastActivePage?.workspaceId === existing.id &&
            !lastActivePage.trashedAt
            ? lastActivePage.id
            : null,
        );
        return existing.id;
      }

      const id = generateId();
      const currentNotebooks = get().notebooks;
      const notebook: Notebook = {
        id,
        name,
        icon: "FolderOpen",
        source: "local-folder",
        localPath,
        localPathMissing: false,
        order: nextNotebookOrder(currentNotebooks),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const nextNotebooks = { ...currentNotebooks, [id]: notebook };
      set({
        notebooks: nextNotebooks,
        activeNotebookId: id,
      });
      // 新本尚没有可复用的页面缓存，必须立即离开旧本编辑器；不能等异步
      // scan 的 showWelcome 收尾才清空，否则新库加载期间会短暂显示旧库正文。
      void pagesStore.setActivePage(null);
      return id;
    },
  };
}
