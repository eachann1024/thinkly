import type { TabSet, TabGet, TabsState } from "./types";
import type { TabsActionContext } from "./context";
import { useFileNavHistory } from "../useFileNavHistory";
import { effectiveSingleTabMode } from "@/lib/tabMode";

export function createHistoryTabActions(
  set: TabSet,
  get: TabGet,
  context: TabsActionContext,
): Pick<
  TabsState,
  | "goBackTabHistory"
  | "goForwardTabHistory"
  | "canGoBackTabHistory"
  | "canGoForwardTabHistory"
  | "reorderTabs"
> {
  const { stepFileNavHistory } = context;
  return {
    goBackTabHistory: () => {
      set({ isHistoryNavigating: true });
      try {
        stepFileNavHistory("back");
      } finally {
        set({ isHistoryNavigating: false });
      }
    },

    goForwardTabHistory: () => {
      set({ isHistoryNavigating: true });
      try {
        stepFileNavHistory("forward");
      } finally {
        set({ isHistoryNavigating: false });
      }
    },

    canGoBackTabHistory: () => useFileNavHistory.getState().canBack(),

    canGoForwardTabHistory: () => useFileNavHistory.getState().canForward(),

    reorderTabs: (from: number, to: number) => {
      if (effectiveSingleTabMode()) return;
      const { openTabs } = get();
      if (from < 0 || from >= openTabs.length) return;
      if (to < 0 || to >= openTabs.length) return;

      const nextTabs = [...openTabs];
      const [moved] = nextTabs.splice(from, 1);
      nextTabs.splice(to, 0, moved);
      set({ openTabs: nextTabs });
    },
  };
}
