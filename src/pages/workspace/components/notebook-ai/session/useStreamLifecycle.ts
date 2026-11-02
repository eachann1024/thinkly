import { useLocale } from "@/i18n";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { useAiStatus } from "@/stores/useAiStatus";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { sanitizeNotebookAiMessages } from "@/lib/notebook-ai/messageUtils";
import { ensureNotebookAiMessageCreatedAt } from "@/lib/notebook-ai/messageTime";
import type { NotebookAiSessionScope } from "./types";
import type { SessionState } from "./useSessionState";
import { stopSessionChat } from "./sessionCompletion";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/session/useStreamLifecycle.ts#messages:1">`
zh-Hans:
  aiResponseTimedOutThisTaskWasPaused: "AI 响应超时，已暂停本次任务"
  completedContentWasPreservedYouCanRetryAt: "已完成的内容已保留，可随时重试。"
en:
  aiResponseTimedOutThisTaskWasPaused: "AI response timed out. This task was paused."
  completedContentWasPreservedYouCanRetryAt: "Completed content was preserved. You can retry at any time."
ja:
  aiResponseTimedOutThisTaskWasPaused: "AI の応答がタイムアウトしたため、このタスクを一時停止しました"
  completedContentWasPreservedYouCanRetryAt: "完了した内容は保持されています。いつでも再試行できます。"
`;
const t = createTranslator(messages);


const NOTEBOOK_AI_STREAM_IDLE_TIMEOUT_MS = 60_000;
export function useStreamLifecycle(state: SessionState) {
  useLocale();
  const {
    activeSessionScopeRef,
    currentSessionScope,
    chat,
    messagesRef,
    messages,
    requestCurrentPageIdRef,
    compactAbortRef,
    aiStatusActiveRef,
    notebookId,
    isCurrentSession,
    setMessages,
    conversationId,
    isStreaming,
    status,
    sessionGeneration,
    isCompacting,
    error,
    clearError,
  } = state;
  useLayoutEffect(() => {
    activeSessionScopeRef.current = currentSessionScope;
    messagesRef.current = messages;
  }, [
    activeSessionScopeRef,
    currentSessionScope,
    messages,
    messagesRef,
  ]);

  useLayoutEffect(() => {
    requestCurrentPageIdRef.current = null;
    return () => {
      compactAbortRef.current?.abort();
      if (aiStatusActiveRef.current) {
        aiStatusActiveRef.current = false;
        useAiStatus.getState().reset();
      }
    };
  }, [
    aiStatusActiveRef,
    compactAbortRef,
    notebookId,
    requestCurrentPageIdRef,
  ]);

  const streamStateRef = useRef<{
    scope: NotebookAiSessionScope;
    wasStreaming: boolean;
  } | null>(null);

  useEffect(() => {
    const scope = currentSessionScope;
    const previous = streamStateRef.current;
    streamStateRef.current = { scope, wasStreaming: isStreaming };
    if (
      !previous ||
      previous.scope.notebookId !== scope.notebookId ||
      previous.scope.conversationId !== scope.conversationId ||
      previous.scope.generation !== scope.generation ||
      !previous.wasStreaming ||
      isStreaming ||
      status !== "ready"
    ) {
      return;
    }

    const cleanedMessages = ensureNotebookAiMessageCreatedAt(
      sanitizeNotebookAiMessages(messages),
    );
    if (isCurrentSession(scope)) {
      setMessages(cleanedMessages);
    }

  }, [
    conversationId,
    currentSessionScope,
    isCurrentSession,
    isStreaming,
    messages,
    notebookId,
    sessionGeneration,
    setMessages,
    status,
  ]);

  const stopAll = useCallback(() => {
    compactAbortRef.current?.abort();
    stopSessionChat(chat, "stopped");
  }, [chat, compactAbortRef]);

  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setTimeout(() => {
      stopSessionChat(chat, "timeout");
      toast.error(t("aiResponseTimedOutThisTaskWasPaused"), {
        id: "notebook-ai-stream-timeout",
        description: t("completedContentWasPreservedYouCanRetryAt"),
      });
    }, NOTEBOOK_AI_STREAM_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [chat, isStreaming, messages]);

  useEffect(() => {
    if (isStreaming || isCompacting) {
      if (!aiStatusActiveRef.current) {
        aiStatusActiveRef.current = true;
        useAiStatus.getState().beginStreaming();
      }
      return;
    }

    if (!aiStatusActiveRef.current) return;
    aiStatusActiveRef.current = false;
    useAiStatus
      .getState()
      .finishStreaming({
        celebrate: status === "ready" && !error &&
          chat.messages.at(-1)?.metadata?.completion === "complete",
      });
  }, [aiStatusActiveRef, chat, error, isCompacting, isStreaming, status]);

  useEffect(() => {
    if (chat.status === "streaming" || chat.status === "submitted") return;
    setMessages(
      useNotebookAiChats
        .getState()
        .getConversationMessages(notebookId, conversationId),
    );
    clearError();
    requestCurrentPageIdRef.current = null;
  }, [
    notebookId,
    conversationId,
    chat,
    setMessages,
    clearError,
    requestCurrentPageIdRef,
  ]);

  return stopAll;
}
