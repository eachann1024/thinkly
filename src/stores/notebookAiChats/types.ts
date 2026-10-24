import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { JSONContent } from "@/types";

export const MAX_MESSAGES_PER_CONVERSATION = 60;

export const MAX_NOTEBOOKS = 20;

export const CONVERSATION_STALE_MS = 30 * 60 * 1000;

export const NOTEBOOK_AI_CHATS_STORAGE_VERSION = 1;

export interface NotebookAiConversation {
  id: string;
  messages: NotebookAiMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface NotebookAiNotebookChatState {
  activeConversationId: string | null;
  conversations: Record<string, NotebookAiConversation>;
  updatedAt: number;
}

export interface NotebookAiChatsPersistedState {
  chats: Record<string, NotebookAiNotebookChatState>;
  composerDrafts: Record<string, JSONContent | null>;
}

export interface LegacyNotebookAiChatState {
  messages: NotebookAiMessage[];
  updatedAt: number;
}

export interface NotebookAiChatsState extends NotebookAiChatsPersistedState {
  getActiveConversationId: (notebookId: string) => string | null;
  getConversationMessages: (
    notebookId: string,
    conversationId?: string,
  ) => NotebookAiMessage[];
  listConversations: (notebookId: string) => NotebookAiConversation[];
  createConversation: (notebookId: string) => string;
  ensureFreshActiveConversation: (
    notebookId: string,
    options?: { now?: number; maxAgeMs?: number },
  ) => string;
  setActiveConversation: (notebookId: string, conversationId: string) => void;
  deleteConversation: (notebookId: string, conversationId: string) => void;
  setMessages: (
    notebookId: string,
    conversationId: string,
    messages: NotebookAiMessage[],
  ) => void;
  clearAllChats: () => void;
  getComposerDraft: (notebookId: string) => JSONContent | null;
  setComposerDraft: (
    notebookId: string,
    content: JSONContent | null | undefined,
  ) => void;
  clearComposerDraft: (notebookId: string) => void;
}
