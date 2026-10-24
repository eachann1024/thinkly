import { useEffect, useRef } from "react";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { FOCUS_AI_COMPOSER_EVENT } from "@/components/editor/ai/composer/selectionQuote";
import type { NotebookAiSessionValue } from "../NotebookAiSession";
import type { PanelSurfaceState } from "./usePanelSurface";

export function usePanelComposerSeed(
  notebookId: string,
  session: NotebookAiSessionValue,
  surface: PanelSurfaceState,
) {
  const { ensureFreshConversation, composerRevision, unavailableReason } = session;
  const { bodyReady, composerRef } = surface;
  const ensureFreshOnOpenRef = useRef(ensureFreshConversation);
  ensureFreshOnOpenRef.current = ensureFreshConversation;
  useEffect(() => {
    ensureFreshOnOpenRef.current();
  }, []);

  const composerSeedContent = useNotebookAiChats.getState().getComposerDraft(notebookId);

  useEffect(() => {
    if (unavailableReason || !bodyReady) return;
    const focusComposer = () => {
      window.requestAnimationFrame(() => {
        if (!isWorkspaceSettingsOpen()) composerRef.current?.focus();
      });
    };
    const timer = window.setTimeout(focusComposer, 50);
    window.addEventListener(FOCUS_AI_COMPOSER_EVENT, focusComposer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(FOCUS_AI_COMPOSER_EVENT, focusComposer);
    };
  }, [unavailableReason, bodyReady, composerRevision, composerRef]);

  return { composerSeedContent };
}
