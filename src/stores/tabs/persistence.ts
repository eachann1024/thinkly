import {
  readWindowContextFromArgv,
  getWindowId,
  tabsPersistKey,
  FALLBACK_WINDOW_ID,
  resolveWindowContext,
} from "@/lib/electron/windowContext";
import { isElectronRuntime } from "@/lib/electron/runtime";
import type { TabItem, TabsState } from "./types";
import type {
  GooseWindowTabSnapshot,
  GooseWindowInitPayload,
} from "@/lib/electron/windowContext";
import {
  ensureSplitForWorkspaceTab,
  syncEditorSplitsToOpenTabs,
} from "./helpers";
import { usePages } from "../usePages";
import { applyPersistedTabSplit } from "../useEditorSplit";
import { transitionTabsStartup, type TabsStartupState, type TabsStartupEvent } from "./startupState";

export const LEGACY_TABS_PERSIST_KEY = "thinkly:open-tabs:v1";

export const argvWindowContext = readWindowContextFromArgv();

export let tabsWindowId = argvWindowContext?.windowId ?? getWindowId();

export let persistReady =
  (Boolean(argvWindowContext) && argvWindowContext?.kind !== "search") ||
  !isElectronRuntime();

export interface PersistedTabs {
  openTabs: TabItem[];
  activeTabId: string | null;
  recentlyClosedPageIds: string[];
}

export const readPersistedTabsRaw = (key: string): PersistedTabs | null => {
  if (typeof window === "undefined") return null;
  try {
    const now = Date.now();
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTabs>;
    if (!Array.isArray(parsed.openTabs)) return null;
    return {
      openTabs: parsed.openTabs
        .filter(
          (t) => t && typeof t.id === "string" && typeof t.pageId === "string",
        )
        .map(({ pinned: _legacyPinned, ...t }: TabItem & { pinned?: unknown }) => ({
          ...t,
          lastAccessedAt:
            typeof t.lastAccessedAt === "number" &&
            Number.isFinite(t.lastAccessedAt)
              ? t.lastAccessedAt
              : now,
        })),
      activeTabId:
        typeof parsed.activeTabId === "string" ? parsed.activeTabId : null,
      recentlyClosedPageIds: Array.isArray(parsed.recentlyClosedPageIds)
        ? parsed.recentlyClosedPageIds.filter((id) => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
};

export const loadPersistedTabs = (): PersistedTabs | null => {
  if (!persistReady) return null;
  const keyed = readPersistedTabsRaw(tabsPersistKey(tabsWindowId));
  if (keyed) return keyed;
  if (tabsWindowId !== FALLBACK_WINDOW_ID) return null;
  const legacy = readPersistedTabsRaw(LEGACY_TABS_PERSIST_KEY);
  if (!legacy || typeof window === "undefined") return legacy;
  try {
    window.localStorage.setItem(
      tabsPersistKey(FALLBACK_WINDOW_ID),
      JSON.stringify(legacy),
    );
    window.localStorage.removeItem(LEGACY_TABS_PERSIST_KEY);
  } catch {
  }
  return legacy;
};

export let persistScheduled = false;

export let pendingPersistState: TabsState | null = null;

export const persistTabs = (state: TabsState) => {
  if (typeof window === "undefined") return;
  if (!persistReady) return;
  pendingPersistState = state;
  if (persistScheduled) return;
  persistScheduled = true;
  queueMicrotask(() => {
    persistScheduled = false;
    const latestState = pendingPersistState;
    pendingPersistState = null;
    if (!latestState) return;
    try {
      const persistableTabs = latestState.openTabs.map((tab) =>
        tab.preview ? { ...tab, preview: false } : tab,
      );
      const activeStillValid = persistableTabs.some(
        (tab) => tab.id === latestState.activeTabId,
      );
      const payload: PersistedTabs = {
        openTabs: persistableTabs,
        activeTabId: activeStillValid
          ? latestState.activeTabId
          : (persistableTabs[persistableTabs.length - 1]?.id ?? null),
        recentlyClosedPageIds: latestState.recentlyClosedPageIds.slice(0, 10),
      };
      window.localStorage.setItem(
        tabsPersistKey(tabsWindowId),
        JSON.stringify(payload),
      );
    } catch {
    }
  });
};

export function startTabsPersistence(
  useTabs: import("zustand").StoreApi<TabsState>,
) {
  if (typeof window !== "undefined") {
    const applyTabSnapshots = (
      tabs: GooseWindowTabSnapshot[],
      activeId?: string,
    ) => {
      const now = Date.now();
      const openTabs: TabItem[] = tabs.map((tab) => ({
        id: tab.id,
        pageId: tab.pageId,
        type: tab.type as TabItem["type"],
        workspaceId: tab.workspaceId,
        lastAccessedAt: now,
      }));
      const activeTabId = activeId ?? openTabs[0]?.id ?? null;
      useTabs.setState({ openTabs, activeTabId });
      const active =
        openTabs.find((tab) => tab.id === activeTabId) ?? openTabs[0];
      if (!active) return;
      ensureSplitForWorkspaceTab(active);
      if (active.type === "welcome") {
        void usePages.getState().setActivePage(null);
        return;
      }
      useTabs.getState().syncNotebookForPage(active.pageId);
      void usePages.getState().setActivePage(active.pageId);
    };

    let startup: TabsStartupState = persistReady
      ? { phase: "ready-default", windowId: tabsWindowId }
      : { phase: "awaiting-window", pending: { source: "default" } };
    const sendStartup = (event: TabsStartupEvent, previousWindowId?: string) => {
      const result = transitionTabsStartup(startup, event);
      startup = result.state;
      for (const command of result.commands) {
        switch (command.type) {
          case "apply-snapshots":
            applyTabSnapshots(command.tabs, command.activeId);
            break;
          case "apply-destination":
            useTabs.setState(command.tabs);
            break;
          case "restore-taken-split": {
            const id = command.tabId ?? useTabs.getState().activeTabId;
            if (id) applyPersistedTabSplit(id, tabsWindowId);
            break;
          }
          case "persist":
            persistTabs(useTabs.getState());
            break;
          case "clean-fallback":
            if (previousWindowId === FALLBACK_WINDOW_ID && tabsWindowId !== FALLBACK_WINDOW_ID) {
              try { window.localStorage.removeItem(tabsPersistKey(previousWindowId)); }
              catch {   }
            }
            break;
        }
      }
    };
    const applyWindowInit = (payload: GooseWindowInitPayload) => {
      if (payload.takeTab) sendStartup({ type: "tab-taken", tab: payload.takeTab });
      else if (payload.restoredTabs?.length) sendStartup({
        type: "tabs-restored", tabs: payload.restoredTabs,
        destinationHasTabs: persistReady && Boolean(readPersistedTabsRaw(tabsPersistKey(tabsWindowId))?.openTabs.length),
      });
    };

    window.gooseDesktop?.onWindowInit?.(applyWindowInit);

    useTabs.subscribe((state) => persistTabs(state));
    useTabs.subscribe((state, prev) => {
      if (
        state.openTabs === prev.openTabs &&
        state.activeTabId === prev.activeTabId
      ) {
        return;
      }
      syncEditorSplitsToOpenTabs(state.openTabs, state.activeTabId);
    });
    syncEditorSplitsToOpenTabs(
      useTabs.getState().openTabs,
      useTabs.getState().activeTabId,
    );
    void resolveWindowContext().then((ctx) => {
      if (ctx.kind === "search") return;
      persistReady = true;
      const prevId = tabsWindowId;
      tabsWindowId = ctx.windowId;
      sendStartup({ type: "context-resolved", windowId: ctx.windowId,
        destination: readPersistedTabsRaw(tabsPersistKey(ctx.windowId)),
      }, prevId);
    });
  }
}
