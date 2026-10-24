import { useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { useSettings } from "@/stores/useSettings";
import { getAiAvailabilityError } from "@/lib/notebook-ai/availabilityError";
import { useChat } from "@ai-sdk/react";
import {
  useNotebookAiChats,
  composerDraftHasContent,
} from "@/stores/useNotebookAiChats";
import { buildLanguageModel } from "@/lib/notebook-ai/model";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { getSessionChat } from "./sessionChat";
import type { NotebookAiSessionScope } from "./types";

import { sessionScopeReducer, type SessionScopeState } from "./sessionScopeState";

export function useSessionState(notebookId: string) {
  const requestCurrentPageIdRef = useRef<string | null>(null);
  const compactAbortRef = useRef<AbortController | null>(null);
  const [scopeState, dispatchScope] = useReducer(sessionScopeReducer, notebookId, (id): SessionScopeState => ({
    status: "idle",
    scope: { notebookId: id, conversationId: useNotebookAiChats.getState().ensureFreshActiveConversation(id), generation: 0 },
  }));
  const session = scopeState.scope;
  const isCompacting = scopeState.status === "compacting";
  const compactSequence = useRef(0);
  const beginCompaction = useCallback((scope: NotebookAiSessionScope) => {
    const requestId = ++compactSequence.current;
    dispatchScope({ type: "compact", scope, requestId });
    return requestId;
  }, []);
  const finishCompaction = useCallback((scope: NotebookAiSessionScope, requestId: number) => {
    dispatchScope({ type: "compaction-finished", scope, requestId });
  }, []);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [composerRevision, setComposerRevision] = useState(0);

  if (session.notebookId !== notebookId) {
    const nextConversationId = useNotebookAiChats
      .getState()
      .ensureFreshActiveConversation(notebookId);
    dispatchScope({ type: "notebook-changed", notebookId, conversationId: nextConversationId });
    setPlaceholderIndex(0);
  }
  const { conversationId, generation: sessionGeneration } = session;
  const currentSessionScope = useMemo<NotebookAiSessionScope>(
    () => ({
      notebookId,
      conversationId,
      generation: sessionGeneration,
    }),
    [conversationId, notebookId, sessionGeneration],
  );
  const activeSessionScopeRef = useRef(currentSessionScope);
  const isCurrentSession = useCallback(
    (scope: NotebookAiSessionScope) =>
      activeSessionScopeRef.current.notebookId === scope.notebookId &&
      activeSessionScopeRef.current.conversationId === scope.conversationId &&
      activeSessionScopeRef.current.generation === scope.generation,
    [],
  );
  const setConversationId = useCallback(
    (nextConversationId: string) =>
      dispatchScope({ type: "conversation-changed", conversationId: nextConversationId }),
    [],
  );

  const composerHasContent = useNotebookAiChats((s) =>
    composerDraftHasContent(s.composerDrafts[notebookId]),
  );

  const ai = useSettings((state) => state.ai);
  const modelCheck = buildLanguageModel();

  const chat = getSessionChat(session.notebookId, conversationId);
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    clearError,
  } = useChat<NotebookAiMessage>({
    chat,
    experimental_throttle: 50,
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isBusy = isStreaming || isCompacting;
  const unavailableReason = !modelCheck.ok
    ? modelCheck.reason
    : !isBusy
      ? getAiAvailabilityError(error)
      : undefined;
  const previousAiRef = useRef(ai);
  useEffect(() => {
    if (previousAiRef.current === ai) return;
    previousAiRef.current = ai;
    if (getAiAvailabilityError(error)) clearError();
  }, [ai, error, clearError]);
  const aiStatusActiveRef = useRef(false);
  const messagesRef = useRef(messages);
  const committedStopRef = useRef(stop);

  return {
    notebookId,
    conversationId,
    chat,
    sessionGeneration,
    currentSessionScope,
    activeSessionScopeRef,
    isCurrentSession,
    setConversationId,
    requestCurrentPageIdRef,
    compactAbortRef,
    placeholderIndex,
    setPlaceholderIndex,
    composerRevision,
    setComposerRevision,
    isCompacting,
    beginCompaction,
    finishCompaction,
    composerHasContent,
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    clearError,
    isStreaming,
    isBusy,
    unavailableReason,
    aiStatusActiveRef,
    messagesRef,
    committedStopRef,
  };
}

export type SessionState = ReturnType<typeof useSessionState>;
