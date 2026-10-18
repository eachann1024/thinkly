import { useEffect } from "react";
import { getGooseDesktop } from "@/lib/electron/runtime";
import {
  resolveSearchResultPageId,
  type OpenSearchResultPayload,
} from "@/lib/electron/searchWindow";
import { usePages } from "@/stores/usePages";
import { useSearchSession } from "./useSearchSession";

/** 新开的主窗只先加载当前笔记本，其余本地文件夹在后台陆续加载；等这么久仍找不到就停在搜索结果。 */
const TARGET_WAIT_MS = 20_000;

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

/**
 * 浮动搜索窗选中结果后由主进程转交到这里：先按同样的入口打开应用内搜索（带上查询词），
 * 再走 targetPage → SearchSessionController 在标签中打开，与应用内搜索一致。
 * 须挂在 useSidebarNavigation 之后，保证 goose-note:open-search 已有监听。
 */
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
    return () => {
      cancelWait();
      unsubscribe();
    };
  }, []);
}
