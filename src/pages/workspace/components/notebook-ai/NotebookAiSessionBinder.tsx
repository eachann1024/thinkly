import { useLocale } from "@/i18n";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { useSessionCommands } from "./session/useSessionCommands";
import { useSessionState } from "./session/useSessionState";
import { useStreamLifecycle } from "./session/useStreamLifecycle";
import { useSendMessage } from "./session/useSendMessage";
import { useConversationActions } from "./session/useConversationActions";
import { useConversationCompaction } from "./session/useConversationCompaction";
import { useBatchApprovalActions } from "./session/useBatchApprovalActions";
import { AI_SLASH_COMMAND_EVENT, takePendingAiSlashCommand } from "./session/slashCommandRequest";
import type { ComposerSlashBuiltinId } from "@/lib/notebook-ai/composerSlashCommands";
import type { NotebookAiSessionValue } from "./session/types";

const RELEASE_IDLE_MS = 30_000;

export function NotebookAiSessionBinder({
  notebookId,
  panelOpen,
  publish,
  onRelease,
}: {
  notebookId: string;
  panelOpen: boolean;
  publish: (value: NotebookAiSessionValue) => void;
  onRelease: () => void;
}) {
  useLocale();
  const state = useSessionState(notebookId);
  const {
    conversationId,
    messages,
    status,
    error,
    clearError,
    isStreaming,
    isBusy,
    unavailableReason,
    placeholderIndex,
    composerRevision,
  } = state;
  const stopAll = useStreamLifecycle(state, panelOpen);
  const send = useSendMessage(state);
  const {
    newConversation,
    ensureFreshConversation,
    selectConversation,
    deleteConversation,
    searchPages,
  } = useConversationActions(state);
  const compactConversation = useConversationCompaction(state);
  const { onBatchApproval, onBatchUndo } = useBatchApprovalActions(state);
  const commands = useSessionCommands({
    clearError, stop: stopAll, send, newConversation, ensureFreshConversation,
    compactConversation, selectConversation, deleteConversation, searchPages,
    onBatchApproval, onBatchUndo,
  });
  const value = useMemo<NotebookAiSessionValue>(
    () => ({
      notebookId,
      conversationId,
      messages,
      status,
      error,
      ...commands,
      isStreaming,
      isBusy,
      unavailableReason,
      placeholderIndex,
      composerRevision,
    }),
    [commands, notebookId, conversationId, messages, status, error, isStreaming, isBusy, unavailableReason, placeholderIndex, composerRevision],
  );

  useLayoutEffect(() => {
    publish(value);
  }, [publish, value]);

  useEffect(() => {
    const run = (id: ComposerSlashBuiltinId) => {
      if (id === "new") commands.newConversation();
      else commands.compactConversation();
    };
    const queued = takePendingAiSlashCommand();
    if (queued) run(queued);
    const onCommand = () => {
      const id = takePendingAiSlashCommand();
      if (id) run(id);
    };
    window.addEventListener(AI_SLASH_COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(AI_SLASH_COMMAND_EVENT, onCommand);
  }, [commands]);

  useEffect(() => {
    if (panelOpen || isBusy) return;
    const timer = window.setTimeout(onRelease, RELEASE_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [panelOpen, isBusy, onRelease]);

  return null;
}
