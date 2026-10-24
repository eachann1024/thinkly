import { useEffect } from "react";
import { getGooseDesktop } from "@/lib/electron/runtime";
import {
  resolveSearchResultPageId,
  type OpenSearchResultPayload,
  type SearchWindowCommand,
} from "@/lib/electron/searchWindow";
import { parseSearchAISettings, shouldPublishWorkspaceAI } from "@/lib/electron/searchAISettings";
import { useNotebooks } from "@/stores/useNotebooks";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { openPageBeside } from "@/lib/editor-split/openPageBeside";
import { SPLIT_PALETTE_ACTIONS } from "../command/splitPaletteActions";
import { askNotebookAi } from "../notebook-ai/approval/refinePlan";
import { requestAiSlashCommand } from "../notebook-ai/session/slashCommandRequest";
import { queueCardSend } from "../notebook-ai/cardSendQueue";
import { openSheetConversation, saveSearchAiTranscript } from "../search-sheet/saveSheetConversation";
import { useSearchSession } from "./useSearchSession";

const TARGET_WAIT_MS = 20_000;
const SETTINGS_KEY = "thinkly-settings";

function readPersistedSearchAI() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { ai?: unknown } };
    return parseSearchAISettings(parsed.state?.ai);
  } catch {
    return null;
  }
}

function waitForTarget(payload: OpenSearchResultPayload, open: (pageId: string) => void): () => void {
  const found = resolveSearchResultPageId(usePages.getState().pages, payload);
  if (found) {
    open(found);
    return () => {};
  }
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    unsubscribe();
    clearTimeout(timer);
  };
  const unsubscribe = usePages.subscribe((state, previous) => {
    if (state.pages === previous.pages) return;
    const pageId = resolveSearchResultPageId(state.pages, payload);
    if (!pageId) return;
    stop();
    open(pageId);
  });
  const timer = setTimeout(stop, TARGET_WAIT_MS);
  return stop;
}

function whenChatsHydrated(): Promise<void> {
  if (useNotebookAiChats.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useNotebookAiChats.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
    if (useNotebookAiChats.persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
}

type SearchAiCommand = Extract<SearchWindowCommand, { type: "archive-ai" | "continue-ai" }>;

const archivedSearchAi = new Map<string, { notebookId: string; conversationId: string }>();

function notebookForAi(fallbackId: string): string | null {
  const notebooks = useNotebooks.getState();
  const live = notebooks.activeNotebookId;
  const notebookId = live && notebooks.notebooks[live] ? live : fallbackId;
  return notebooks.notebooks[notebookId] ? notebookId : null;
}

async function rememberSearchAi(command: SearchAiCommand): Promise<{ notebookId: string; conversationId: string } | null> {
  const existing = archivedSearchAi.get(command.token);
  if (existing) return existing;
  await whenChatsHydrated();
  const notebookId = notebookForAi(command.notebookId);
  if (!notebookId) return null;
  const again = archivedSearchAi.get(command.token);
  if (again) return again;
  const conversationId = saveSearchAiTranscript(notebookId, command.question, command.text, command.sources);
  const record = { notebookId, conversationId };
  archivedSearchAi.set(command.token, record);
  return record;
}

function applySearchWindowCommand(command: Exclude<SearchWindowCommand, { type: "open-beside" }>): void {
  if (command.type === "hide-recent") {
    useSettings.getState().setShowRecentInSearch(false);
    return;
  }
  if (command.type === "open-settings") {
    window.dispatchEvent(new CustomEvent("goose-note:open-settings", { detail: { tab: "ai" } }));
    return;
  }
  if (command.type === "split") {
    SPLIT_PALETTE_ACTIONS.find((action) => action.id === command.action)?.run();
    return;
  }
  if (command.type === "ai-slash") {
    requestAiSlashCommand(command.id);
    return;
  }
  if (command.type === "ask-ai") {
    const notebookId = notebookForAi(command.notebookId);
    if (notebookId) askNotebookAi({ notebookId, text: command.question });
    return;
  }
  if (command.type === "archive-ai") {
    void rememberSearchAi(command);
    return;
  }
  void rememberSearchAi(command).then((record) => {
    if (!record) return;
    if (command.type === "continue-ai" && command.followUp) queueCardSend({ notebookId: record.notebookId, conversationId: record.conversationId, text: command.followUp });
    openSheetConversation(record.notebookId, record.conversationId);
  });
}

export function useSearchWindowHandoff(): void {
  useEffect(() => {
    const api = getGooseDesktop();
    if (!api?.onOpenSearchResult) return;
    let cancelWait = () => {};
    const unsubscribe = api.onOpenSearchResult((payload) => {
      cancelWait();
      useSearchSession.getState().setQuery(payload.query);
      window.dispatchEvent(new CustomEvent("goose-note:open-search", {
        detail: { selectionQuery: payload.query },
      }));
      cancelWait = waitForTarget(payload, (pageId) => {
        useSearchSession.getState().targetPage(pageId, true);
      });
    });
    const unsubscribeCommand = api.onSearchWindowCommand?.((command) => {
      if (command.type !== "open-beside") {
        applySearchWindowCommand(command);
        return;
      }
      cancelWait();
      cancelWait = waitForTarget(command, (pageId) => {
        openPageBeside(pageId, command.placement);
      });
    });
    const publishAISettings = () => {
      const state = useSettings.getState();
      if (!state._hasHydrated) return;
      const memory = parseSearchAISettings({ ...state.ai, hydrated: true });
      if (!shouldPublishWorkspaceAI(memory, readPersistedSearchAI())) return;
      api.publishWorkspaceAISettings?.(memory);
    };
    publishAISettings();
    const unsubscribeAI = useSettings.subscribe((state, prev) => {
      if (state._hasHydrated === prev._hasHydrated && state.ai === prev.ai) return;
      publishAISettings();
    });
    return () => {
      cancelWait();
      unsubscribe();
      unsubscribeCommand?.();
      unsubscribeAI();
    };
  }, []);
}
