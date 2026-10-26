import { Chat } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { getCurrentNotebookAiPageId } from "@/lib/notebook-ai/context";
import { getNotebookAiRunContext } from "@/lib/notebook-ai/runContext";
import { prepareNotebookAiMessagesForModel } from "@/lib/notebook-ai/messageUtils";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";

import { persistSessionMessages } from "./sessionMessages";
import { finishSessionChat } from "./sessionCompletion";

const chats = new Map<string, Chat<NotebookAiMessage>>();

export function getSessionChat(notebookId: string, conversationId: string) {
  const key = `${notebookId}:${conversationId}`;
  const existing = chats.get(key);
  if (existing) return existing;
  const transport: ChatTransport<NotebookAiMessage> = {
    async sendMessages(options) {
      const user = [...options.messages].reverse().find((message) => message.role === "user");
      const currentPageId = user?.metadata && "currentPageId" in user.metadata
        ? user.metadata.currentPageId ?? null : getCurrentNotebookAiPageId(notebookId);
      const { buildTransport } = await import("@/lib/notebook-ai/transport");
      options.abortSignal?.throwIfAborted();
      const result = buildTransport(
        notebookId, currentPageId, getNotebookAiRunContext(options.messages),
      );
      if (!result.ok) throw new Error(result.reason);
      return result.transport.sendMessages({
        ...options, messages: prepareNotebookAiMessagesForModel(options.messages),
      });
    },
    async reconnectToStream() {
      return null;
    },
  };
  const chat: Chat<NotebookAiMessage> = new Chat<NotebookAiMessage>({
    id: `notebook-ai-${notebookId}-${conversationId}`,
    messages: useNotebookAiChats.getState().getConversationMessages(notebookId, conversationId),
    transport,
    onFinish: (finish) => {
      persistSessionMessages(notebookId, conversationId, finishSessionChat(chat, finish));
    },
  });
  chats.set(key, chat);
  if (chats.size > 24) {
    for (const [oldKey, oldChat] of chats) {
      if (chats.size <= 24) break;
      if (oldKey !== key && oldChat.status !== "streaming" && oldChat.status !== "submitted") chats.delete(oldKey);
    }
  }
  return chat;
}
