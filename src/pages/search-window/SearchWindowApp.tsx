import { useLocale } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { refreshReadOnlyPersistence } from "@/bootstrap/readOnlyPersistence";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type { SearchWindowCommand } from "@/lib/electron/searchWindow";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { SearchSheet } from "@/pages/workspace/components/search-sheet/SearchSheet";
import { useSearchSession } from "@/pages/workspace/components/sidebar/useSearchSession";
import { readOnlySearchFolderSource } from "@/pages/workspace/components/sidebar/readOnlySearchFolderSource";
import { useCommandSearchIndexWarmup } from "@/pages/workspace/components/command/useCommandSearchIndexWarmup";
import { Toaster } from "@/components/ui/sonner";
import "./search-window.css";

const SETTINGS_KEY = "thinkly-settings";

/** 主窗不在时，只改共享设置里的「搜索显示最近」字段，避免用本窗旧快照覆盖整份设置。 */
function patchPersistedShowRecent(enabled: boolean): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    if (!parsed.state || typeof parsed.state !== "object") return;
    parsed.state.showRecentInSearch = enabled;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    // 写失败时本窗内存已更新，下次唤出再跟主窗对齐。
  }
}

/** 每次唤出重开会话：拿最新的当前笔记本作起点，并以新的来源引用触发一次后台重扫。 */
function reopenSession(): void {
  const session = useSearchSession.getState();
  session.closeSearch();
  session.openSearch(useNotebooks.getState().activeNotebookId, null, 0);
}

/**
 * 浮动搜索窗根组件：复用应用内搜索面板，会话常开（窗口自身负责显隐）。
 * 打开结果、续聊、设置与分屏交给主窗；Esc / 关闭只收起窗口。
 */
export function SearchWindowApp() {
  useLocale();
  useCommandSearchIndexWarmup();
  const [folderSource, setFolderSource] = useState(() => ({ ...readOnlySearchFolderSource }));

  useEffect(() => {
    const api = getGooseDesktop();
    let disposed = false;
    const refresh = async () => {
      try {
        await refreshReadOnlyPersistence();
      } catch (error) {
        console.error("[search-window] 读取设置或笔记本失败", error);
      }
      if (disposed) return;
      reopenSession();
      setFolderSource({ ...readOnlySearchFolderSource });
    };
    // 首次挂载即打开会话再通知主进程显示；隐藏窗口不跑 rAF，这里不能等下一帧。
    void refresh().then(() => {
      if (!disposed) void api?.searchWindowReady?.();
    });
    const unsubscribe = api?.onSearchWindowShown?.(() => void refresh());
    // 焦点不在面板内（如点到空白处）时 Esc 仍收起窗口；面板内的 Esc 由面板自己处理。
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      if (event.target === document.body || event.target === document.documentElement) void api?.hideSearchWindow?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      disposed = true;
      unsubscribe?.();
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
      {/* 浮窗尺寸小：与速记小窗一致，居中只显示一条。 */}
      <Toaster placement="center" />
    </div>
  );
}
