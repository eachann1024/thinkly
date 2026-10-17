import { useCallback } from "react";
import { toast } from "@/components/ui/sonner";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { ensureNotebookAiMessageCreatedAt } from "@/lib/notebook-ai/messageTime";
import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import {
  buildCompactedConversation,
  conversationHasCompactableContent,
  generateConversationCompactSummary,
} from "@/lib/notebook-ai/compactConversation";
import { createChatMessageId } from "./helpers";
import type { SessionState } from "./useSessionState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/session/useConversationCompaction.ts#messages:1">`
zh-Hans:
  waitForAiToFinishRespondingBeforeCompacting: "AI 正在回复中，请待生成结束后再压缩上下文"
  thereIsNoHistoryToCompactInThis: "当前会话暂无需要压缩的历史内容"
  conversationContextCompacted: "会话上下文已压缩"
  compactionFailed: "压缩失败"
en:
  waitForAiToFinishRespondingBeforeCompacting: "Wait for AI to finish responding before compacting the context"
  thereIsNoHistoryToCompactInThis: "There is no history to compact in this conversation"
  conversationContextCompacted: "Conversation context compacted"
  compactionFailed: "Compaction failed"
`;
const t = createTranslator(messages);


export function useConversationCompaction(state: SessionState) {
  const {
    isBusy,
    unavailableReason,
    messagesRef,
    compactAbortRef,
    currentSessionScope,
    beginCompaction,
    finishCompaction,
    clearError,
    isCurrentSession,
    setMessages,
    notebookId,
    conversationId,
  } = state;
  const compactConversation = useCallback(() => {
    if (isBusy || (compactAbortRef.current && !compactAbortRef.current.signal.aborted)) {
      toast.warning(t("waitForAiToFinishRespondingBeforeCompacting"));
      return;
    }
    if (unavailableReason) {
      toast.error(unavailableReason);
      return;
    }
    const currentMessages = messagesRef.current;
    if (!conversationHasCompactableContent(currentMessages)) {
      toast.info(t("thereIsNoHistoryToCompactInThis"));
      return;
    }

    compactAbortRef.current?.abort();
    const scope = currentSessionScope;
    const abort = new AbortController();
    compactAbortRef.current = abort;
    const requestId = beginCompaction(scope);
    clearError();

    void generateConversationCompactSummary(currentMessages, abort.signal)
      .then((summary) => {
        if (abort.signal.aborted || !isCurrentSession(scope)) return;
        const compacted = ensureNotebookAiMessageCreatedAt(
          buildCompactedConversation({
            summary,
            createId: createChatMessageId,
          }),
        );
        setMessages(compacted);
        useNotebookAiChats
          .getState()
          .setMessages(notebookId, conversationId, compacted);
        toast.success(t("conversationContextCompacted"));
      })
      .catch((error) => {
        if (abort.signal.aborted || !isCurrentSession(scope)) return;
        toast.error(t("compactionFailed"), {
          description: formatNotebookAiError(error, { phase: "chat" }),
        });
      })
      .finally(() => {
        if (compactAbortRef.current === abort) {
          compactAbortRef.current = null;
        }
        if (isCurrentSession(scope)) {
          finishCompaction(scope, requestId);
        }
      });
  }, [
    isBusy,
    unavailableReason,
    messagesRef,
    compactAbortRef,
    currentSessionScope,
    beginCompaction,
    finishCompaction,
    clearError,
    isCurrentSession,
    setMessages,
    notebookId,
    conversationId,
  ]);

  return compactConversation;
}
