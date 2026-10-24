import { useCallback, useEffect, useRef } from "react";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import type { JSONContent } from "@/types";
const COMPOSER_DRAFT_PERSIST_MS = 500;
export function useComposerDraft(notebookId: string) {
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSeqRef = useRef(0);
  const cancelPendingDraftPersist = useCallback(() => {
    draftSeqRef.current += 1;
    if (draftTimerRef.current != null) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingDraftPersist();
    };
  }, [cancelPendingDraftPersist]);

  const handleContentChange = useCallback(
    (content: JSONContent | null) => {
      const seq = ++draftSeqRef.current;
      if (draftTimerRef.current != null) {
        clearTimeout(draftTimerRef.current);
      }
      draftTimerRef.current = setTimeout(() => {
        draftTimerRef.current = null;
        if (seq !== draftSeqRef.current) return;
        useNotebookAiChats.getState().setComposerDraft(notebookId, content);
      }, COMPOSER_DRAFT_PERSIST_MS);
    },
    [notebookId],
  );

  return { cancelPendingDraftPersist, handleContentChange };
}
