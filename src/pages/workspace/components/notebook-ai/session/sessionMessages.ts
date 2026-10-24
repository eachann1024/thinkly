import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { ensureNotebookAiMessageCreatedAt } from "@/lib/notebook-ai/messageTime";
import { sanitizeNotebookAiMessages } from "@/lib/notebook-ai/messageUtils";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";

/** Persist to the captured owner; a deleted conversation must not be recreated by a late callback. */
export function persistSessionMessages(notebookId: string, conversationId: string, messages: NotebookAiMessage[]) {
  const store = useNotebookAiChats.getState();
  if (!store.chats[notebookId]?.conversations[conversationId]) return false;
  store.setMessages(notebookId, conversationId,
    ensureNotebookAiMessageCreatedAt(sanitizeNotebookAiMessages(messages)));
  return true;
}
