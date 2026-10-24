import { isStandaloneFile } from "@/lib/standaloneFileCapabilities";
import { useNotebooks } from "../../../useNotebooks";
import { useSidebarView } from "../../../useSidebarView";
import type { StoreSet, StoreGet } from "../hydrate";
import { flushEditorContent } from "../flushEditor";
import { resolveVisibleRowAfterDeletion } from "./helpers";
import {
  persistPageSnapshots,
  removePersistedPageSnapshots,
} from "../../persistence";
import { runWithPresence } from "@/lib/ui/presence";
import {
  clearDeleteFailure,
  isMissingFileError,
  rememberDeleteFailure,
} from "@/lib/delete-failure";
import {
  acquireLocalPageFileOperation,
  discardPendingLocalSave,
} from "../../folderSync";

function syncSidebarSelectionAfterDelete(
  workspaceId: string,
  removedIds: Set<string>,
  get: StoreGet,
  fallbackPageId?: string | null,
): void {
  const view = useSidebarView.getState();
  const focused = view.focusedByNotebook[workspaceId];
  const selected = view.selectedByNotebook[workspaceId];
  if (!removedIds.has(focused || "") && !removedIds.has(selected || "")) {
    return;
  }
  const nextActive =
    fallbackPageId !== undefined ? fallbackPageId : get().activePageId;
  if (removedIds.has(focused || "")) {
    view.setFocused(workspaceId, nextActive);
  }
  if (removedIds.has(selected || "")) {
    view.setSelected(workspaceId, nextActive);
  }
}

export const deletePageAction = async (
  set: StoreSet,
  get: StoreGet,
  id: string,
  options?: { trashBatchId?: string; onLocalTrash?: (token: string) => void },
): Promise<boolean> => {
  flushEditorContent();
  clearDeleteFailure();
  const page = get().pages[id];
  if (!page) return false;
  if (isStandaloneFile(page)) {
    rememberDeleteFailure(new Error("outside the allowed folders"));
    return false;
  }

  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  const isLocalFolder = notebook?.source === "local-folder";
  if (isLocalFolder && notebook?.localPath) {
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

    discardPendingLocalSave(id);
    const releaseFileOperation = await acquireLocalPageFileOperation(id);
    try {
      const current = get().pages[id];
      if (!current) return true;
      if (!window.gooseFs) {
        rememberDeleteFailure(new Error("desktop-unavailable"));
        return false;
      }
      const targetPath = current.localFilePath || resolvePathFromId(id);

      const removedIds = new Set<string>();
      const stack = [id];
      const snapshotPages = get().pages;
      const expandedIds =
        useSidebarView.getState().expandedByNotebook[current.workspaceId] ?? [];
      while (stack.length) {
        const currentId = stack.pop()!;
        removedIds.add(currentId);
        Object.values(snapshotPages).forEach((p) => {
          if (p.parentId === currentId) stack.push(p.id);
        });
      }
      const sidebarView = useSidebarView.getState();
      const removedFocusedOrSelected =
        removedIds.has(sidebarView.focusedByNotebook[current.workspaceId] || "") ||
        removedIds.has(sidebarView.selectedByNotebook[current.workspaceId] || "");
      const nextSelectionPageId = removedFocusedOrSelected
        ? resolveVisibleRowAfterDeletion({
            pages: snapshotPages,
            currentPage: current,
            removedIds,
            isLocalNotebook: true,
            expandedIds,
          })
        : undefined;

      const fileExists = targetPath
        ? window.gooseFs.existsAsync
          ? await window.gooseFs.existsAsync(targetPath)
          : window.gooseFs.exists(targetPath)
        : false;
      let token: string | null = null;
      if (targetPath && fileExists) {
        try {
          if (window.gooseFs.trashWithUndo) {
            token = await window.gooseFs.trashWithUndo(targetPath);
            if (!token) throw new Error("trash-failed");
          } else {
            const removedFile = current.isFolder
              ? await window.gooseFs.deleteDir(targetPath)
              : await window.gooseFs.deleteFile(targetPath);
            if (!removedFile) throw new Error("trash-failed");
          }
        } catch (error) {
          const stillThere = window.gooseFs.existsAsync
            ? await window.gooseFs.existsAsync(targetPath)
            : window.gooseFs.exists(targetPath);
          if (!isMissingFileError(error) && stillThere) {
            rememberDeleteFailure(error);
            return false;
          }
        }
      }

      runWithPresence(() => set((state) => {
        const newPages = { ...state.pages };
        removedIds.forEach((pid) => delete newPages[pid]);

        let nextActivePageId = state.activePageId;
        if (removedIds.has(state.activePageId || "")) {
          nextActivePageId = resolveVisibleRowAfterDeletion({
            pages: state.pages,
            currentPage: current,
            removedIds,
            isLocalNotebook: true,
            expandedIds,
          });
          useNotebooks
            .getState()
            .setLastActivePage(current.workspaceId, nextActivePageId);
        }

        return {
          pages: newPages,
          activePageId: nextActivePageId,
        };
      }));

      syncSidebarSelectionAfterDelete(
        current.workspaceId,
        removedIds,
        get,
        nextSelectionPageId,
      );

      removePersistedPageSnapshots(snapshotPages, removedIds);

      if (token) options?.onLocalTrash?.(token);
      return true;
    } finally {
      releaseFileOperation();
    }
  }

  const workspaceId = page.workspaceId;
  const changedIds: string[] = [];
  const removedIdsForSync = new Set<string>();

  runWithPresence(() => set((state) => {
    const removedIds = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const currentId = stack.pop()!;
      removedIds.add(currentId);
      Object.values(state.pages).forEach((p) => {
        if (p.parentId === currentId && !p.trashedAt) stack.push(p.id);
      });
    }
    removedIds.forEach((pid) => removedIdsForSync.add(pid));

    const newPages = { ...state.pages };
    const now = Date.now();
    const batchId = options?.trashBatchId || `b-${now}-${id}`;
    removedIds.forEach((pid) => {
      if (newPages[pid]) {
        newPages[pid] = {
          ...newPages[pid],
          trashedAt: now,
          trashBatchId: batchId,
          updatedAt: now,
          isFavorite: false,
          isPinned: false,
          pinnedAt: undefined,
        };
        changedIds.push(pid);
      }
    });

    let newActivePageId = state.activePageId;
    if (removedIds.has(state.activePageId || "")) {
      newActivePageId = resolveVisibleRowAfterDeletion({
        pages: state.pages,
        currentPage: page,
        removedIds,
        isLocalNotebook: false,
        expandedIds:
          useSidebarView.getState().expandedByNotebook[workspaceId] ?? [],
      });
      useNotebooks.getState().setLastActivePage(workspaceId, newActivePageId);
    }

    return {
      pages: newPages,
      activePageId: newActivePageId,
    };
  }));

  syncSidebarSelectionAfterDelete(workspaceId, removedIdsForSync, get);

  persistPageSnapshots(get().pages, changedIds);

  return true;
};
