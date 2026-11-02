import { useCallback, useEffect, useRef } from "react";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { registerNotebookAiDraft } from "@/stores/notebookAiDraftPersistence";
import type { JSONContent } from "@/types";

const COMPOSER_DRAFT_PERSIST_MS = 500;
export function useComposerDraft(notebookId: string) {
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ notebookId: string; content: JSONContent | null } | null>(null);
  const cancelPendingDraftPersist = useCallback(() => {
    pendingRef.current = null;
    if (draftTimerRef.current != null) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);
  const flush = useCallback(() => {
    const pending = pendingRef.current;
    cancelPendingDraftPersist();
    if (pending) useNotebookAiChats.getState().setComposerDraft(pending.notebookId, pending.content);
  }, [cancelPendingDraftPersist]);

  useEffect(() => {
    const unregister = registerNotebookAiDraft(notebookId, { flush, cancel: cancelPendingDraftPersist });
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    window.addEventListener("goose-note:flush-editor", flush);
    return () => {
      // Closing or switching notebooks must keep text typed within the debounce
      // window. Explicit clear/new-conversation actions cancel it first.
      unregister();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("goose-note:flush-editor", flush);
      flush();
    };
  }, [notebookId, cancelPendingDraftPersist, flush]);

  const handleContentChange = useCallback((content: JSONContent | null) => {
    cancelPendingDraftPersist();
    pendingRef.current = { notebookId, content };
    draftTimerRef.current = setTimeout(flush, COMPOSER_DRAFT_PERSIST_MS);
  }, [notebookId, cancelPendingDraftPersist, flush]);

  return { cancelPendingDraftPersist, handleContentChange };
}
