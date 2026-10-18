import { useEffect, useRef, useState, useReducer } from "react";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { yieldSearchTask } from "../command/searchTaskScheduling";
import { folderRefreshReducer } from "./searchFolderRefreshState";
import type { SearchScope } from "./useSearchSession";

/** Wait until the navigation animation has finished, then refresh while idle. */
function scheduleRefresh(run: () => void): () => void {
  const controller = new AbortController();
  void yieldSearchTask(controller.signal, true).then(() => {
    if (!controller.signal.aborted) run();
  });
  return () => controller.abort();
}

/** 搜索打开时刷新本地文件夹页面的来源：主窗走 store 的完整加载，浮动搜索窗走只读扫描。 */
export type SearchFolderSource = {
  isReady: (notebookId: string) => boolean;
  /** 有实时文件监听：已就绪时无需后台重扫。 */
  isLive: (notebookId: string) => boolean;
  load: (notebookId: string, basePath: string) => Promise<void>;
};

export const workspaceSearchFolderSource: SearchFolderSource = {
  isReady: (id) => useNotebooks.getState().localFolderLoadStates[id]?.status === "ready",
  // Only the active notebook has a live filesystem watcher.
  isLive: (id) => useNotebooks.getState().activeNotebookId === id,
  load: (id, basePath) => usePages.getState().loadLocalFolderPages(id, basePath),
};

export function useSearchFolderRefresh(
  open: boolean,
  scope: SearchScope,
  source: SearchFolderSource = workspaceSearchFolderSource,
) {
  const [refresh, dispatch] = useReducer(folderRefreshReducer, { status: "idle" });
  const loading = refresh.status === "refreshing" && refresh.blocking;
  const loadError = refresh.status !== "idle" && refresh.failedIds.length > 0;
  const [retry, setRetry] = useState(0);
  const handledRetry = useRef(0);
  const scopedId = scope.kind === "all" ? null : scope.notebookId;

  useEffect(() => {
    if (!open) { dispatch({ type: "reset" }); return; }
    let cancelled = false;
    let cancelScheduled = () => {};
    const forceReload = retry !== handledRetry.current;
    handledRetry.current = retry;
    const state = useNotebooks.getState();
    const skippable = (id: string) => !forceReload && source.isLive(id) && source.isReady(id);
    const targets = Object.values(state.notebooks).filter((notebook) => {
      if (notebook.source !== "local-folder" || !notebook.localPath) return false;
      if (scope.kind !== "all" && notebook.id !== scopedId) return false;
      // Notebooks without a live watcher still refresh in the background so
      // external edits remain searchable.
      return !skippable(notebook.id);
    });
    dispatch({ type: "start", blocking: targets.some(notebook => forceReload ||
      !source.isReady(notebook.id)) });

    const refreshNext = (index: number) => {
      if (cancelled) return;
      const notebook = targets[index];
      if (!notebook) {
        dispatch({ type: "complete" });
        return;
      }
      cancelScheduled = scheduleRefresh(() => {
        if (cancelled) return;
        const current = useNotebooks.getState();
        const latest = current.notebooks[notebook.id];
        if (latest?.localPath !== notebook.localPath) {
          refreshNext(index + 1);
          return;
        }
        if (skippable(notebook.id)) {
          refreshNext(index + 1);
          return;
        }
        void source.load(notebook.id, notebook.localPath!)
          .catch(() => { if (!cancelled) dispatch({ type: "failed", notebookId: notebook.id }); })
          .finally(() => refreshNext(index + 1));
      });
    };
    refreshNext(0);
    return () => {
      cancelled = true;
      cancelScheduled();
    };
  }, [open, scope.kind, scopedId, retry, source]);

  return { loading, loadError, retryLoad: () => setRetry((value) => value + 1) };
}
