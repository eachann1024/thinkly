import { ipcRenderer } from "electron";
import {
  OPEN_SEARCH_RESULT_CHANNEL,
  SEARCH_WINDOW_SHOWN_CHANNEL,
  type OpenSearchResultPayload,
} from "../../src/lib/electron/searchWindow";

// 主窗可能刚由浮动搜索窗唤起、渲染层尚未订阅；先缓存，订阅时补发一次。
let pendingSearchResult: OpenSearchResultPayload | null = null;
const subscribers = new Set<(payload: OpenSearchResultPayload) => void>();

function deliverPending(): void {
  const payload = pendingSearchResult;
  const [first] = subscribers;
  if (!payload || !first) return;
  pendingSearchResult = null;
  first(payload);
}

ipcRenderer.on(OPEN_SEARCH_RESULT_CHANNEL, (_event, payload: OpenSearchResultPayload) => {
  pendingSearchResult = payload;
  deliverPending();
});

export const searchWindow = {
  hideSearchWindow: () => ipcRenderer.invoke("desktop:hideSearchWindow") as Promise<void>,
  searchWindowReady: () => ipcRenderer.invoke("desktop:searchWindowReady") as Promise<void>,
  openSearchResult: (payload: OpenSearchResultPayload) =>
    ipcRenderer.invoke("desktop:openSearchResult", payload) as Promise<boolean>,
  onSearchWindowShown: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on(SEARCH_WINDOW_SHOWN_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(SEARCH_WINDOW_SHOWN_CHANNEL, listener);
    };
  },
  /** 每条结果只交付一次，避免订阅方重挂载时重复打开。 */
  onOpenSearchResult: (cb: (payload: OpenSearchResultPayload) => void) => {
    subscribers.add(cb);
    queueMicrotask(deliverPending);
    return () => {
      subscribers.delete(cb);
    };
  },
};
