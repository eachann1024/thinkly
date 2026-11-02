import type { PersistStorage } from "zustand/middleware";
import type { JSONContent } from "@/types";
import { getDbStorageItem, setDbStorageItem, removeDbStorageItem } from "@/lib/storage";
import { migrateNotebookAiChatsState } from "./notebookAiChats/migrations";
import { NOTEBOOK_AI_CHATS_STORAGE_VERSION } from "./notebookAiChats/types";
import type { NotebookAiChatsPersistedState, NotebookAiConversation } from "./notebookAiChats/types";

type State = NotebookAiChatsPersistedState;
type Index = {
  format: "split-v1";
  version: number;
  chats: Record<string, { activeConversationId: string | null; updatedAt: number; conversationIds: string[] }>;
  draftIds: string[];
};
type Storage = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => boolean;
  remove: (key: string) => boolean;
};
const emptyState = (): State => ({ chats: {}, composerDrafts: {} });
const sessionKey = (name: string, notebookId: string, conversationId: string) =>
  `${name}:session:${encodeURIComponent(notebookId)}:${encodeURIComponent(conversationId)}`;
const draftKey = (name: string, notebookId: string) => `${name}:draft:${encodeURIComponent(notebookId)}`;

// Keep the public Zustand shape and notebook-scoped draft behavior. On disk,
// each conversation and each notebook draft has its own independently saved key.
export function createNotebookAiChatStorage(storage: Storage = {
  read: getDbStorageItem, write: setDbStorageItem, remove: removeDbStorageItem,
}): PersistStorage<State> {
  let saved = emptyState();
  let savedIndex: string | null = null;
  const write = (key: string, value: unknown) => {
    const raw = JSON.stringify(value);
    if (!storage.write(key, raw)) throw new Error("Could not persist notebook AI chat data");
    return raw;
  };
  const makeIndex = (state: State, version: number): Index => ({
    format: "split-v1", version,
    chats: Object.fromEntries(Object.entries(state.chats).map(([id, chat]) => [id, {
      activeConversationId: chat.activeConversationId,
      updatedAt: chat.updatedAt,
      conversationIds: Object.keys(chat.conversations),
    }])),
    draftIds: Object.keys(state.composerDrafts),
  });
  const save = (name: string, state: State, version: number) => {
    if (state.chats !== saved.chats) {
      for (const [notebookId, chat] of Object.entries(state.chats)) {
        const previous = saved.chats[notebookId];
        if (chat === previous) continue;
        for (const [id, conversation] of Object.entries(chat.conversations)) {
          if (conversation === previous?.conversations[id]) continue;
          write(sessionKey(name, notebookId, id), conversation);
        }
      }
    }
    if (state.composerDrafts !== saved.composerDrafts) {
      for (const [id, draft] of Object.entries(state.composerDrafts)) {
        if (draft === saved.composerDrafts[id]) continue;
        write(draftKey(name, id), draft);
      }
    }
    const nextIndex = JSON.stringify(makeIndex(state, version));
    // Commit the index after its entries. A failed migration leaves the legacy
    // envelope intact, so all old history and drafts remain recoverable.
    if (nextIndex !== savedIndex && !storage.write(name, nextIndex)) {
      throw new Error("Could not persist notebook AI chat index");
    }
    for (const [notebookId, chat] of Object.entries(saved.chats)) {
      for (const id of Object.keys(chat.conversations)) {
        if (!state.chats[notebookId]?.conversations[id]) storage.remove(sessionKey(name, notebookId, id));
      }
    }
    for (const id of Object.keys(saved.composerDrafts)) {
      if (!(id in state.composerDrafts)) storage.remove(draftKey(name, id));
    }
    saved = state;
    savedIndex = nextIndex;
  };
  return {
    getItem(name) {
      const raw = storage.read(name);
      if (!raw) { saved = emptyState(); savedIndex = null; return null; }
      const stored = JSON.parse(raw);
      if (stored.format !== "split-v1") {
        const state: State = stored.version === NOTEBOOK_AI_CHATS_STORAGE_VERSION
          ? { chats: stored.state?.chats ?? {}, composerDrafts: stored.state?.composerDrafts ?? {} }
          : migrateNotebookAiChatsState(stored.state);
        saved = emptyState();
        savedIndex = null;
        try { save(name, state, NOTEBOOK_AI_CHATS_STORAGE_VERSION); }
        catch { /* Keep serving legacy data; the next write retries migration. */ }
        return { state, version: NOTEBOOK_AI_CHATS_STORAGE_VERSION };
      }
      const index = stored as Index;
      const state = emptyState();
      for (const [notebookId, chat] of Object.entries(index.chats)) {
        const conversations: Record<string, NotebookAiConversation> = {};
        for (const id of chat.conversationIds) {
          const value = storage.read(sessionKey(name, notebookId, id));
          if (value !== null) conversations[id] = JSON.parse(value);
        }
        state.chats[notebookId] = {
          activeConversationId: chat.activeConversationId, updatedAt: chat.updatedAt, conversations,
        };
      }
      for (const id of index.draftIds) {
        const value = storage.read(draftKey(name, id));
        if (value !== null) state.composerDrafts[id] = JSON.parse(value) as JSONContent | null;
      }
      saved = state;
      savedIndex = raw;
      return { state, version: index.version };
    },
    setItem(name, { state, version }) {
      try { save(name, state, version ?? NOTEBOOK_AI_CHATS_STORAGE_VERSION); }
      catch (error) { console.error("[notebook-ai] Chat persistence failed", error); }
    },
    removeItem(name) {
      storage.remove(name);
      for (const [notebookId, chat] of Object.entries(saved.chats)) {
        for (const id of Object.keys(chat.conversations)) storage.remove(sessionKey(name, notebookId, id));
      }
      for (const id of Object.keys(saved.composerDrafts)) storage.remove(draftKey(name, id));
      saved = emptyState();
      savedIndex = null;
    },
  };
}
