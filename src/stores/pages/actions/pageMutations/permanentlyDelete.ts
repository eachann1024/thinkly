import { runWithPresence } from "@/lib/ui/presence";
import { useNotebooks } from "../../../useNotebooks";
import type { StoreSet, StoreGet } from "../hydrate";
import {
  removePersistedPageSnapshot,
  removePersistedPageSnapshots,
} from "../../persistence";
import { resolveHistoryBackend } from "../../../../lib/history/backend";
import {
  clearLocalSaveTimers,
  clearPendingLocalSaveContent,
} from "../../folderSync";

export const permanentlyDeletePageAction = async (
  set: StoreSet,
  get: StoreGet,
  id: string,
): Promise<void> => {
  const page = get().pages[id];
  const notebook = page
    ? useNotebooks.getState().notebooks[page.workspaceId]
    : undefined;
  const isLocalFolder = notebook?.source === "local-folder";

  if (isLocalFolder && notebook?.localPath) {
    if (typeof window === "undefined" || !window.gooseFs) return;
    if (!page) return;
    const snapshotPages = get().pages;

    const resolvePathFromId = (pageId: string) => {
      const prefix = `local-${page.workspaceId}-`;
      if (!pageId.startsWith(prefix)) return null;
      const encoded = pageId.slice(prefix.length);
      try {
        const relativePath = decodeURIComponent(encoded);
        return `${notebook.localPath}/${relativePath}`;
      } catch {
        return null;
      }
    };

    const targetPath = page.localFilePath || resolvePathFromId(id);
    if (!targetPath) return;

    const removedIds = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const currentId = stack.pop()!;
      removedIds.add(currentId);
      Object.values(get().pages).forEach((p) => {
        if (p.parentId === currentId) stack.push(p.id);
      });
    }

    const deleted = page.isFolder
      ? await window.gooseFs.deleteDir(targetPath)
      : await window.gooseFs.deleteFile(targetPath);
    if (!deleted) return;

    removedIds.forEach((pid) => {
      void resolveHistoryBackend(pid).dropAll(pid);
    });

    removedIds.forEach((pid) => {
      clearLocalSaveTimers(pid);
      clearPendingLocalSaveContent(pid);
    });

    runWithPresence(() => set((state) => {
      const newPages = { ...state.pages };
      removedIds.forEach((pid) => delete newPages[pid]);

      const newDirtyLocalPageIds = { ...state.dirtyLocalPageIds };
      removedIds.forEach((pid) => delete newDirtyLocalPageIds[pid]);

      let nextActivePageId = state.activePageId;
      if (removedIds.has(state.activePageId || "")) {
        nextActivePageId = null;
        useNotebooks.getState().setLastActivePage(page.workspaceId, null);
      }

      return {
        pages: newPages,
        activePageId: nextActivePageId,
        dirtyLocalPageIds: newDirtyLocalPageIds,
      };
    }));
    removePersistedPageSnapshots(snapshotPages, removedIds);
    return;
  }

  const targetPage = get().pages[id];
  if (targetPage) {
    void resolveHistoryBackend(id).dropAll(id);
  }
  clearLocalSaveTimers(id);
  clearPendingLocalSaveContent(id);
  runWithPresence(() => set((state) => {
    const page = state.pages[id];
    if (!page) return state;
    const workspaceId = page.workspaceId;
    const deletingTrashedPage = !!page.trashedAt;
    const newPages = { ...state.pages };
    delete newPages[id];

    const newDirtyLocalPageIds = { ...state.dirtyLocalPageIds };
    delete newDirtyLocalPageIds[id];

    let newActivePageId = state.activePageId;
    if (state.activePageId === id) {
      if (deletingTrashedPage) {
        const trashedPagesAfterDelete = Object.values(newPages)
          .filter((p) => p.workspaceId === workspaceId && !!p.trashedAt)
          .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0));

        if (trashedPagesAfterDelete.length > 0) {
          const trashedPagesBeforeDelete = Object.values(state.pages)
            .filter((p) => p.workspaceId === workspaceId && !!p.trashedAt)
            .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0));

          const deletedPageIndex = trashedPagesBeforeDelete.findIndex(
            (p) => p.id === id,
          );
          const safeCurrentIndex = Math.max(deletedPageIndex, 0);
          const nextIndex =
            safeCurrentIndex >= trashedPagesAfterDelete.length
              ? trashedPagesAfterDelete.length - 1
              : safeCurrentIndex;

          newActivePageId = trashedPagesAfterDelete[nextIndex].id;
        } else {
          newActivePageId = null;
        }
      } else {
        const siblings = Object.values(newPages)
          .filter(
            (p) =>
              p.workspaceId === workspaceId && !p.trashedAt && p.id !== id,
          )
          .sort(
            (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
          );

        if (siblings.length > 0) {
          const deletedPageIndex = Object.values(state.pages)
            .filter((p) => p.workspaceId === workspaceId && !p.trashedAt)
            .sort(
              (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
            )
            .findIndex((p) => p.id === id);

          const nextIndex =
            deletedPageIndex >= siblings.length
              ? siblings.length - 1
              : deletedPageIndex;
          newActivePageId = siblings[nextIndex].id;
        } else {
          newActivePageId = null;
        }
      }
    }

    return {
      pages: newPages,
      activePageId: newActivePageId,
      dirtyLocalPageIds: newDirtyLocalPageIds,
    };
  }));
  removePersistedPageSnapshot(targetPage, id);
};
