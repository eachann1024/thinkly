import { useLocale } from "@/i18n";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { useAiStatus } from "@/stores/useAiStatus";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { sanitizeNotebookAiMessages } from "@/lib/notebook-ai/messageUtils";
import { ensureNotebookAiMessageCreatedAt } from "@/lib/notebook-ai/messageTime";
import { getNotebookAiPlaceholderHints } from "./helpers";
import type { NotebookAiSessionScope } from "./types";
import type { SessionState } from "./useSessionState";
import { revokeRunWriteScope } from "@/lib/notebook-ai/resourceScope";
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
    committedStopRef,
    stop,
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
    unavailableReason,
    isBusy,
    composerHasContent,
    setPlaceholderIndex,
  } = state;
  useLayoutEffect(() => {
    activeSessionScopeRef.current = currentSessionScope;
    committedStopRef.current = stop;
    messagesRef.current = messages;
  }, [
    activeSessionScopeRef,
    committedStopRef,
    currentSessionScope,
    messages,
    messagesRef,
    stop,
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
    committedStopRef,
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
    const user = [...chat.messages].reverse().find((message) => message.role === "user");
    if (user?.metadata?.writeScope) revokeRunWriteScope(user.metadata.writeScope.runId);
    void stop();
  }, [chat, compactAbortRef, stop]);

  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setTimeout(() => {
      void committedStopRef.current();
      toast.error(t("aiResponseTimedOutThisTaskWasPaused"), {
        id: "notebook-ai-stream-timeout",
        description: t("completedContentWasPreservedYouCanRetryAt"),
      });
    }, NOTEBOOK_AI_STREAM_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [committedStopRef, isStreaming, messages]);

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
      .finishStreaming({ celebrate: status === "ready" && !error });
  }, [aiStatusActiveRef, error, isCompacting, isStreaming, status]);

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

  useEffect(() => {
    if (unavailableReason || isBusy || composerHasContent) return;

    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (timer !== null) return;
      timer = window.setInterval(() => {
        setPlaceholderIndex(
          (index) => (index + 1) % getNotebookAiPlaceholderHints().length,
        );
      }, 4500);
    };
    const sync = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [unavailableReason, isBusy, composerHasContent, setPlaceholderIndex]);

  return stopAll;
}
