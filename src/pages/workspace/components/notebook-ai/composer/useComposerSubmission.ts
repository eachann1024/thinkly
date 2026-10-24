import { useCallback, useRef } from "react";
import { isComposerPayloadEmpty } from "@/components/editor/ai/composer/composerTokens";
import { normalizeAiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { matchComposerPayloadSlashCommand } from "@/lib/notebook-ai/composerSlashCommands";
import type { ComposerProps } from "./types";
import type { ComposerSurfaceState } from "./useComposerSurface";
export function useComposerSubmission(
  props: ComposerProps,
  surface: ComposerSurfaceState,
  cancelPendingDraftPersist: () => void,
) {
  const { disabled, isStreaming, onSend, onSlashCommand, notebookId } = props;
  const { inputRef, setIsEmpty, setAutoFocusToken } = surface;
  const visibleNotebook = useRef(notebookId);
  visibleNotebook.current = notebookId;
  const handleSubmit = useCallback(async () => {
    if (disabled || isStreaming) return;
    const input = inputRef.current;
    const payload = input?.getPayload();
    if (!payload) return;

    const images = input?.resolveImages(payload) ?? [];
    const slashCommand = matchComposerPayloadSlashCommand(payload);
    if (slashCommand && images.length === 0) {
      input?.clear();
      cancelPendingDraftPersist();
      useNotebookAiChats.getState().clearComposerDraft(notebookId);
      setIsEmpty(true);
      setAutoFocusToken((token) => token + 1);
      onSlashCommand?.(slashCommand);
      return;
    }

    if (isComposerPayloadEmpty(payload) && images.length === 0) return;

    const submittedPayload = JSON.stringify(payload);
    const normalized = normalizeAiComposerPayload(payload);
    const accepted = await onSend(normalized.payload, images);
    if (accepted === false) return;
    if (visibleNotebook.current !== notebookId || inputRef.current !== input ||
      JSON.stringify(input?.getPayload()) !== submittedPayload) return;

    input?.clear();
    cancelPendingDraftPersist();
    useNotebookAiChats.getState().clearComposerDraft(notebookId);
    setIsEmpty(true);
    setAutoFocusToken((token) => token + 1);
  }, [
    disabled,
    isStreaming,
    inputRef,
    onSend,
    cancelPendingDraftPersist,
    notebookId,
    setIsEmpty,
    setAutoFocusToken,
    onSlashCommand,
  ]);

  return handleSubmit;
}
