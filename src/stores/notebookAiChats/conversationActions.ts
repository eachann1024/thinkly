import type {
  NotebookAiChatsState,
  NotebookAiConversation,
  NotebookAiNotebookChatState,
} from "./types";
import {
  normalizeMessages,
  pruneNotebookChats,
  createConversationId,
} from "./normalization";
import { CONVERSATION_STALE_MS } from "./types";

export function createConversationChatActions(
  set: import("zustand").StoreApi<NotebookAiChatsState>["setState"],
  get: import("zustand").StoreApi<NotebookAiChatsState>["getState"],
): Pick<
  NotebookAiChatsState,
  | "getActiveConversationId"
  | "getConversationMessages"
  | "listConversations"
  | "createConversation"
  | "ensureFreshActiveConversation"
  | "setActiveConversation"
> {
  return {
    getActiveConversationId: (notebookId) => {
      return get().chats[notebookId]?.activeConversationId ?? null;
    },

    getConversationMessages: (notebookId, conversationId) => {
      const notebookChat = get().chats[notebookId];
      const resolvedConversationId =
        conversationId ?? notebookChat?.activeConversationId;
      if (!resolvedConversationId) return [];

      return normalizeMessages(
        notebookChat?.conversations[resolvedConversationId]?.messages,
      );
    },

    listConversations: (notebookId) => {
      const conversations = Object.values(
        get().chats[notebookId]?.conversations ?? {},
      );

      return conversations
        .map((conversation) => ({
          ...conversation,
          messages: normalizeMessages(conversation.messages),
        }))
        .filter((conversation) => conversation.messages.length > 0)
        .sort((left, right) => right.updatedAt - left.updatedAt);
    },

    createConversation: (notebookId) => {
      let conversationId = "";

      set((state) => {
        const now = Date.now();
        const currentNotebookChat = state.chats[notebookId];
        const emptyConversation = Object.values(
          currentNotebookChat?.conversations ?? {},
        )
          .filter((conversation) => conversation.messages.length === 0)
          .sort((left, right) => right.updatedAt - left.updatedAt)[0];

        if (emptyConversation) {
          conversationId = emptyConversation.id;
          return {
            chats: pruneNotebookChats(
              {
                ...state.chats,
                [notebookId]: {
                  ...currentNotebookChat,
                  activeConversationId: conversationId,
                  updatedAt: now,
                },
              },
              notebookId,
            ),
          };
        }

        conversationId = createConversationId();
        const conversation: NotebookAiConversation = {
          id: conversationId,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        const notebookChat: NotebookAiNotebookChatState = {
          activeConversationId: conversationId,
          conversations: {
            ...(currentNotebookChat?.conversations ?? {}),
            [conversationId]: conversation,
          },
          updatedAt: now,
        };

        return {
          chats: pruneNotebookChats(
            {
              ...state.chats,
              [notebookId]: notebookChat,
            },
            notebookId,
          ),
        };
      });

      return conversationId;
    },

    ensureFreshActiveConversation: (notebookId, options) => {
      const now = options?.now ?? Date.now();
      const maxAgeMs = options?.maxAgeMs ?? CONVERSATION_STALE_MS;
      const notebookChat = get().chats[notebookId];
      const activeId = notebookChat?.activeConversationId ?? null;
      const activeConversation = activeId
        ? notebookChat?.conversations[activeId]
        : undefined;

      if (!activeConversation || activeConversation.messages.length === 0) {
        return get().createConversation(notebookId);
      }

      const lastActiveAt = Math.max(
        notebookChat?.updatedAt ?? 0,
        activeConversation.updatedAt,
      );
      if (now - lastActiveAt < maxAgeMs) {
        get().setActiveConversation(notebookId, activeConversation.id);
        return activeConversation.id;
      }

      return get().createConversation(notebookId);
    },

    setActiveConversation: (notebookId, conversationId) => {
      set((state) => {
        const notebookChat = state.chats[notebookId];
        const conversation = notebookChat?.conversations[conversationId];
        if (!notebookChat || !conversation) return state;

        const now = Date.now();
        if (notebookChat.activeConversationId === conversationId) {
          return {
            chats: {
              ...state.chats,
              [notebookId]: {
                ...notebookChat,
                conversations: {
                  ...notebookChat.conversations,
                  [conversationId]: {
                    ...conversation,
                    updatedAt: now,
                  },
                },
                updatedAt: now,
              },
            },
          };
        }

        return {
          chats: {
            ...state.chats,
            [notebookId]: {
              ...notebookChat,
              activeConversationId: conversationId,
              conversations: {
                ...notebookChat.conversations,
                [conversationId]: {
                  ...conversation,
                  updatedAt: now,
                },
              },
              updatedAt: now,
            },
          },
        };
      });
    },
  };
}
