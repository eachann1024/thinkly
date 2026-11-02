import { useEffect } from "react";
import { usePages } from "@/stores/usePages";
import { createHistoryRecorderSession } from "./historyRecorderSession";

export function useHistoryRecorder(): void {
  useEffect(() => {
    let pageId: string | undefined;
    let workspaceId: string | undefined;
    let previousPage: unknown;
    let session: ReturnType<typeof createHistoryRecorderSession> | undefined;

    const observe = (state: ReturnType<typeof usePages.getState>) => {
      const page = state.activePageId ? state.pages[state.activePageId] : undefined;
      if (page?.id !== pageId || page?.workspaceId !== workspaceId) {
        session?.dispose();
        pageId = page?.id;
        workspaceId = page?.workspaceId;
        previousPage = undefined;
        session = page ? createHistoryRecorderSession(page.id, page.workspaceId) : undefined;
      }
      if (page === previousPage) return;
      previousPage = page;
      if (page) session?.observe(page);
    };

    const unsubscribe = usePages.subscribe(observe);
    observe(usePages.getState());
    return () => {
      unsubscribe();
      session?.dispose();
    };
  }, []);
}
