import {
  FALLBACK_WINDOW_ID,
  getWindowId,
  readWindowContextFromArgv,
  resolveWindowContext,
} from "@/lib/electron/windowContext";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { parseSyncScrollFlags } from "@/lib/editor-split/syncScroll";
import { useEditorSplit } from "../useEditorSplit";

export const SYNC_SCROLL_PERSIST_KEY_PREFIX = "thinkly:editor-split-sync:v1";

export function syncScrollPersistKey(windowId: string): string {
  return `${SYNC_SCROLL_PERSIST_KEY_PREFIX}:${windowId}`;
}

const argvWindowContext = readWindowContextFromArgv();
let windowId = argvWindowContext?.windowId ?? getWindowId();
let persistReady =
  (Boolean(argvWindowContext) && argvWindowContext?.kind !== "search") ||
  !isElectronRuntime();

function readFlags(id: string): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    return parseSyncScrollFlags(window.localStorage.getItem(syncScrollPersistKey(id)));
  } catch {
    return {};
  }
}

export function loadInitialSyncScroll(): Record<string, true> {
  if (!persistReady) return {};
  return readFlags(windowId);
}

function writeFlags(flags: Record<string, true>) {
  if (typeof window === "undefined" || !persistReady) return;
  try {
    window.localStorage.setItem(syncScrollPersistKey(windowId), JSON.stringify(flags));
  } catch {
    // 隐私模式 / 配额
  }
}

export function startSyncScrollPersistence() {
  if (typeof window === "undefined") return;
  useEditorSplit.subscribe((state, previous) => {
    if (state.syncScrollByTabId === previous.syncScrollByTabId) return;
    writeFlags(state.syncScrollByTabId);
  });
  void resolveWindowContext().then((ctx) => {
    if (ctx.kind === "search") {
      persistReady = false;
      return;
    }
    const previousId = windowId;
    windowId = ctx.windowId;
    persistReady = true;
    useEditorSplit.setState({ syncScrollByTabId: readFlags(ctx.windowId) });
    if (previousId === FALLBACK_WINDOW_ID && ctx.windowId !== FALLBACK_WINDOW_ID) {
      try {
        window.localStorage.removeItem(syncScrollPersistKey(previousId));
      } catch {
        // 忽略
      }
    }
  });
}
