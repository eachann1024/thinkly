import { create } from "zustand";
import type { NotebookAiChatsState } from "./notebookAiChats/types";
import { persist } from "zustand/middleware";
import { createNotebookAiChatStorage } from "./notebookAiChatStorage";
import { cancelNotebookAiDrafts } from "./notebookAiDraftPersistence";
import { createConversationChatActions } from "./notebookAiChats/conversationActions";
import { createContentChatActions } from "./notebookAiChats/contentActions";
import { NOTEBOOK_AI_CHATS_STORAGE_VERSION } from "./notebookAiChats/types";
import { migrateNotebookAiChatsState } from "./notebookAiChats/migrations";

export const useNotebookAiChats = create<NotebookAiChatsState>()(
  persist(
    (set, get) => {
      const content = createContentChatActions(set, get);
      return {
        chats: {},
        composerDrafts: {},
        ...createConversationChatActions(set, get),
        ...content,
        clearComposerDraft: (notebookId) => {
          cancelNotebookAiDrafts(notebookId);
          content.clearComposerDraft(notebookId);
        },
        clearAllChats: () => {
          cancelNotebookAiDrafts();
          content.clearAllChats();
        },
      };
    },
    {
      name: "thinkly-notebook-ai-chats",
      version: NOTEBOOK_AI_CHATS_STORAGE_VERSION,
      storage: createNotebookAiChatStorage(),
      skipHydration: true,
      migrate: (persistedState: unknown) =>
        migrateNotebookAiChatsState(persistedState),
      partialize: (state) => ({
        chats: state.chats,
        composerDrafts: state.composerDrafts,
      }),
    },
  ),
);

export {
  CONVERSATION_STALE_MS,
  type NotebookAiConversation,
  type NotebookAiNotebookChatState,
  type NotebookAiChatsState,
} from "./notebookAiChats/types";
export {
  stripComposerDraftImages,
  composerDraftHasContent,
} from "./notebookAiChats/composerDraft";
export { migrateNotebookAiChatsState } from "./notebookAiChats/migrations";
