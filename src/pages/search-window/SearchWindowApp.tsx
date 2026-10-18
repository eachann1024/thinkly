import { useLocale } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { refreshReadOnlyPersistence } from "@/bootstrap/readOnlyPersistence";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useNotebooks } from "@/stores/useNotebooks";
import { SearchSheet } from "@/pages/workspace/components/search-sheet/SearchSheet";
import { useSearchSession } from "@/pages/workspace/components/sidebar/useSearchSession";
import { readOnlySearchFolderSource } from "@/pages/workspace/components/sidebar/readOnlySearchFolderSource";
import { useCommandSearchIndexWarmup } from "@/pages/workspace/components/command/useCommandSearchIndexWarmup";
import type { SearchResultPage } from "@/pages/workspace/components/command/useCommandSearch";
import "./search-window.css";

/** 每次唤出重开会话：拿最新的当前笔记本作起点，并以新的来源引用触发一次后台重扫。 */
function reopenSession(): void {
  const session = useSearchSession.getState();
  session.closeSearch();
  session.openSearch(useNotebooks.getState().activeNotebookId, null, 0);
}

/**
 * 浮动搜索窗根组件：复用应用内搜索面板，会话常开（窗口自身负责显隐），
 * 打开结果交给主窗，Esc / 关闭只收起窗口。
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

  const openResult = useCallback((page: SearchResultPage) => {
    const { query } = useSearchSession.getState();
    void getGooseDesktop()?.openSearchResult?.({
      pageId: page.id,
      query,
      ...(page.localFilePath ? { localFilePath: page.localFilePath } : {}),
    });
  }, []);

  return (
    <div className="search-window-root">
      <SearchSheet
        aiNotebookId={null}
        variant="window"
        onOpenResult={openResult}
        onClose={close}
        folderSource={folderSource}
      />
    </div>
  );
}
