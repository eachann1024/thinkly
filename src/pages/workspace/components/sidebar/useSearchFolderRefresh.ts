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

export function useSearchFolderRefresh(open: boolean, scope: SearchScope) {
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
    const targets = Object.values(state.notebooks).filter((notebook) => {
      if (notebook.source !== "local-folder" || !notebook.localPath) return false;
      if (scope.kind !== "all" && notebook.id !== scopedId) return false;
      // Only the active notebook has a live filesystem watcher. Other notebooks
      // still refresh in the background so external edits remain searchable.
      return forceReload || notebook.id !== state.activeNotebookId ||
        state.localFolderLoadStates[notebook.id]?.status !== "ready";
    });
    dispatch({ type: "start", blocking: targets.some(notebook => forceReload ||
      state.localFolderLoadStates[notebook.id]?.status !== "ready") });

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
        if (!forceReload && current.activeNotebookId === notebook.id &&
          current.localFolderLoadStates[notebook.id]?.status === "ready") {
          refreshNext(index + 1);
          return;
        }
        void usePages.getState().loadLocalFolderPages(notebook.id, notebook.localPath!)
          .catch(() => { if (!cancelled) dispatch({ type: "failed", notebookId: notebook.id }); })
          .finally(() => refreshNext(index + 1));
      });
    };
    refreshNext(0);
    return () => {
      cancelled = true;
      cancelScheduled();
    };
  }, [open, scope.kind, scopedId, retry]);

  return { loading, loadError, retryLoad: () => setRetry((value) => value + 1) };
}
