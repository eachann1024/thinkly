import {
  getWindowId,
  tabsPersistKey,
} from "@/lib/electron/windowContext";
import { useEditorSplit, writeTabSplitForWindow } from "@/stores/useEditorSplit";
import { useTabs } from "@/stores/useTabs";

export function detachTabFromThisWindow(
  tabId: string,
  destWindowId?: string,
): void {
  const split = useEditorSplit.getState();
  const tree = split.getStateForTab(tabId);
  if (tree && destWindowId) {
    writeTabSplitForWindow(destWindowId, tabId, tree);
  }
  const { emptied } = useTabs.getState().releaseTab(tabId);
  if (!emptied) return;
  try {
    window.localStorage.removeItem(tabsPersistKey(getWindowId()));
  } catch {
  }
  void window.gooseDesktop?.closeWindow?.();
}
