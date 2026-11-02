import { useCallback } from "react";
import { ChatMessages } from "../ChatMessages";
import { useNotebookAiMessages, useNotebookAiSession } from "../session/context";
import { CardActionsProvider } from "../../ai-cards/cardActions";
import { AiUnavailableState } from "./AiUnavailableState";
import { textPayload, usePanelCardActions } from "./usePanelCardActions";
import type { NotebookAiPanelProps } from "./types";
import type { PanelCommands } from "./usePanelCommands";

export function NotebookAiMessageSurface({
  props,
  bodyReady,
  unavailable,
  isFullscreen,
  handleSend,
}: {
  props: NotebookAiPanelProps;
  bodyReady: boolean;
  unavailable: boolean;
  isFullscreen: boolean;
  handleSend: PanelCommands["handleSend"];
}) {
  const messages = useNotebookAiMessages();
  const {
    conversationId, isBusy, isStreaming, onBatchApproval, onBatchUndo,
    unavailableReason, error, clearError,
  } = useNotebookAiSession();
  const { notebookId, editorRef } = props;
  const cardActions = usePanelCardActions({
    notebookId, conversationId, isBusy, ready: bodyReady && !unavailable,
    editorRef, sendPayload: handleSend,
  });
  const onEmptySuggestion = useCallback((text: string) => {
    void handleSend(textPayload(text), []);
  }, [handleSend]);
  const streamingMessageId = isStreaming ? messages.at(-1)?.id : undefined;

  return (
    <div className="notebook-ai-zoom-slot notebook-ai-content-surface">
      <div className="notebook-ai-zoom-surface">
        {bodyReady && (!unavailable || messages.length > 0) ? (
          <CardActionsProvider value={cardActions}>
            <ChatMessages
              messages={messages}
              onEmptySuggestion={onEmptySuggestion}
              streamingMessageId={streamingMessageId}
              editorRef={editorRef}
              layout={isFullscreen ? "fullscreen" : "side-panel"}
              onBatchApproval={onBatchApproval}
              onBatchUndo={onBatchUndo}
            />
          </CardActionsProvider>
        ) : null}
        {bodyReady && unavailable ? (
          <AiUnavailableState
            reason={unavailableReason}
            error={error}
            onRetry={clearError}
            compact={messages.length > 0}
          />
        ) : null}
      </div>
    </div>
  );
}
