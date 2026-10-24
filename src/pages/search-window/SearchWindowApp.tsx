import { useLocale } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { refreshReadOnlyPersistence } from "@/bootstrap/readOnlyPersistence";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { parseSearchAISettings, shouldApplySearchAISettings } from "@/lib/electron/searchAISettings";
import type { SearchWindowCommand } from "@/lib/electron/searchWindow";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { normalizeAISettings } from "@/stores/settings/types/ai";
import { SearchSheet } from "@/pages/workspace/components/search-sheet/SearchSheet";
import { useSearchSession } from "@/pages/workspace/components/sidebar/useSearchSession";
import { readOnlySearchFolderSource } from "@/pages/workspace/components/sidebar/readOnlySearchFolderSource";
import { useCommandSearchIndexWarmup } from "@/pages/workspace/components/command/useCommandSearchIndexWarmup";
import { Toaster } from "@/components/ui/sonner";
import "./search-window.css";

const SETTINGS_KEY = "thinkly-settings";

function patchPersistedShowRecent(enabled: boolean): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    if (!parsed.state || typeof parsed.state !== "object") return;
    parsed.state.showRecentInSearch = enabled;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
  }
}

function applyWorkspaceAISnapshot(raw: unknown): void {
  const snapshot = parseSearchAISettings(raw);
  const current = parseSearchAISettings(useSettings.getState().ai);
  if (!snapshot || !shouldApplySearchAISettings(current, snapshot)) return;
  useSettings.setState({ ai: normalizeAISettings(snapshot) });
}

function pullWorkspaceAISettings(): { settled: boolean; value: unknown; done: Promise<unknown> } {
  const slot: { settled: boolean; value: unknown; done: Promise<unknown> } = {
    settled: false,
    value: null,
    done: Promise.resolve(null),
  };
  const request = getGooseDesktop()?.pullWorkspaceAISettings?.();
  if (!request) {
    slot.settled = true;
    return slot;
  }
  slot.done = request.then((value) => {
    slot.settled = true;
    slot.value = value;
    return value;
  }, () => {
    slot.settled = true;
    slot.value = null;
    return null;
  });
  return slot;
}

function reopenSession(): void {
  const session = useSearchSession.getState();
  session.closeSearch();
  session.openSearch(useNotebooks.getState().activeNotebookId, null, 0);
}

export function SearchWindowApp() {
  useLocale();
  useCommandSearchIndexWarmup();
  const [folderSource, setFolderSource] = useState(() => ({ ...readOnlySearchFolderSource }));

  useEffect(() => {
    const api = getGooseDesktop();
    let disposed = false;
    const refresh = async () => {
      const pulled = pullWorkspaceAISettings();
      try {
        await refreshReadOnlyPersistence();
      } catch (error) {
        console.error("[search-window] 读取设置或笔记本失败", error);
      }
      if (disposed) return;
      if (pulled.settled) applyWorkspaceAISnapshot(pulled.value);
      else void pulled.done.then((value) => {
        if (!disposed) applyWorkspaceAISnapshot(value);
      });
      reopenSession();
      setFolderSource({ ...readOnlySearchFolderSource });
    };
    void refresh().then(() => {
      if (!disposed) void api?.searchWindowReady?.();
    });
    const unsubscribe = api?.onSearchWindowShown?.(() => void refresh());
    const unsubscribeAI = api?.onWorkspaceAISettings?.((settings) => {
      if (!disposed) applyWorkspaceAISnapshot(settings);
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      if (event.target === document.body || event.target === document.documentElement) void api?.hideSearchWindow?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      disposed = true;
      unsubscribe?.();
      unsubscribeAI?.();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const close = useCallback(() => {
    void getGooseDesktop()?.hideSearchWindow?.();
  }, []);

  const openResult = useCallback((page: { id: string; localFilePath?: string }) => {
    const { query } = useSearchSession.getState();
    void getGooseDesktop()?.openSearchResult?.({
      pageId: page.id,
      query,
      ...(page.localFilePath ? { localFilePath: page.localFilePath } : {}),
    });
  }, []);

  const sendCommand = useCallback((command: SearchWindowCommand) => {
    if (command.type === "hide-recent") useSettings.getState().setShowRecentInSearch(false);
    void getGooseDesktop()?.searchWindowCommand?.(command).then((delivered) => {
      if (command.type === "hide-recent" && !delivered) patchPersistedShowRecent(false);
    });
  }, []);

  const aiNotebookId = useNotebooks((state) => state.activeNotebookId || Object.keys(state.notebooks)[0] || null);

  return (
    <div className="search-window-root">
      <SearchSheet
        aiNotebookId={aiNotebookId}
        variant="window"
        onOpenResult={openResult}
        onCommand={sendCommand}
        onClose={close}
        folderSource={folderSource}
      />
      { }
      <Toaster placement="center" />
    </div>
  );
}
