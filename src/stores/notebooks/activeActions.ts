import type { NotebooksState } from "./types";
import { usePages } from "../usePages";
import { fs } from "@/lib/electron-platform/fs";
import { IDLE_LOCAL_FOLDER_LOAD_STATE, transitionLocalFolderLoad } from "./localFolderLoadState";

export function createActiveNotebookActions(
  set: import("zustand").StoreApi<NotebooksState>["setState"],
  get: import("zustand").StoreApi<NotebooksState>["getState"],
): Pick<
  NotebooksState,
  | "setActiveNotebook"
  | "getNotebook"
  | "setLastActivePage"
  | "getLastActivePage"
  | "dispatchLocalFolderLoadEvent"
  | "getLocalFolderLoadState"
> {
  return {
    setActiveNotebook: (id) => {
      const pagesStore = usePages.getState();
      const pendingId = pagesStore.pendingNavigatePageId;
      const pendingPage = pendingId ? pagesStore.pages[pendingId] : undefined;
      const notebook = get().notebooks[id];
      const lastActivePageId = get().lastActivePageByNotebook[id];
      const lastActivePage = lastActivePageId
        ? pagesStore.pages[lastActivePageId]
        : undefined;
      const cachedLocalLandingPageId =
        notebook?.source === "local-folder" &&
        lastActivePage?.workspaceId === id &&
        !lastActivePage.trashedAt
          ? lastActivePage.id
          : null;
      const keepsPendingTarget = pendingPage?.workspaceId === id;
      set({ activeNotebookId: id });
      if (notebook?.source === "local-folder" && !keepsPendingTarget) {
        void pagesStore.setActivePage(cachedLocalLandingPageId);
      }
      if (
        notebook?.source === "local-folder" &&
        notebook.localPath &&
        typeof window !== "undefined" &&
        fs.isAvailable()
      ) {
        void (async () => {
          const { resolveLocalNotebookRoot } = await import("@/lib/resolve-local-notebook");
          const root = await resolveLocalNotebookRoot(notebook);

          if (get().activeNotebookId !== id) return;

          if (root) {
            if (notebook.localPathMissing) {
              get().updateNotebook(id, { localPathMissing: false });
            }
            await usePages
              .getState()
              .loadLocalFolderPages(id, root);
          } else {
            if (!notebook.localPathMissing) {
              get().updateNotebook(id, { localPathMissing: true });
            }
            usePages.getState().removePagesByWorkspaceId(id);
          }
        })().catch((error) => {
          console.error("[local-folder] 切换记事本时加载失败", error);
        });
      }

      if (pendingId) {
        if (pendingPage && pendingPage.workspaceId === id) {
          pagesStore.setActivePage(pendingId);
          pagesStore.setExpandPageId(pendingId);

          const isLoadingLocal =
            notebook?.source === "local-folder" &&
            notebook.localPath &&
            typeof window !== "undefined" &&
            fs.isAvailable();

          if (!isLoadingLocal) {
            pagesStore.setPendingNavigatePageId(null);
          }
        }
      }
    },

    getNotebook: (id) => {
      return get().notebooks[id];
    },

    setLastActivePage: (notebookId, pageId) => {
      set((state) => ({
        lastActivePageByNotebook: {
          ...state.lastActivePageByNotebook,
          [notebookId]: pageId,
        },
      }));
    },

    getLastActivePage: (notebookId) => {
      return get().lastActivePageByNotebook[notebookId] || null;
    },

    dispatchLocalFolderLoadEvent: (notebookId, event) => {
      set((state) => {
        if (!state.notebooks[notebookId]) return state;
        const previous = state.localFolderLoadStates[notebookId] ?? IDLE_LOCAL_FOLDER_LOAD_STATE;
        const next = transitionLocalFolderLoad(previous, event);
        return previous === next ? state : {
          localFolderLoadStates: { ...state.localFolderLoadStates, [notebookId]: next },
        };
      });
    },

    getLocalFolderLoadState: (notebookId) => {
      return (
        get().localFolderLoadStates[notebookId] ?? IDLE_LOCAL_FOLDER_LOAD_STATE
      );
    },
  };
}
