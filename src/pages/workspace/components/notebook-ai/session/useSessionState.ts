import { useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { useSettings } from "@/stores/useSettings";
import { getAiAvailabilityError } from "@/lib/notebook-ai/availabilityError";
import { useChat } from "@ai-sdk/react";
import {
  useNotebookAiChats,
  composerDraftHasContent,
} from "@/stores/useNotebookAiChats";
// transport → agent → ai / @earendil-works 的工具链约 350KB，只有真正发消息时才需要；
// 静态引用它会把整个 SDK 链拉进首帧。
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

  // WorkspaceLayout 不再用 key 重挂整个 Provider。这里在 render 期间把新笔记本
  // 的会话状态一次性换好，React 会立即重渲染，子节点不会拿到旧 notebook 的消息。
  // 原 Chat 继续归属原会话；压缩任务由 layout effect 清理。
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
    // 流式 token 不节流会每字触发 messages → 全树 commit + Streamdown 重解析，整面板卡顿。
    // ~50ms ≈ 20fps UI 更新，观感仍流畅，React commit 次数大幅下降。
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
    // 配置更新后允许重新连接；不重发上一轮，避免重复执行笔记工具。
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
