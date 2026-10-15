import type { TabItem } from "./types";
import { isSpecialTab } from "./types";
import { useEditorSplit } from "../useEditorSplit";
import { usePages } from "../usePages";
import { useNotebooks } from "../useNotebooks";
import { walkLeaves } from "@/lib/editor-split/tree";

/** 空草稿不落库；重开窗口时保留同标签里仍存在的源文件。 */
export function reconcileSplitTabPage(tab: TabItem): TabItem {
  if (isSpecialTab(tab)) return tab;
  const notebook = tab.workspaceId
    ? useNotebooks.getState().notebooks[tab.workspaceId] : undefined;
  if (notebook?.source === "local-folder" &&
    useNotebooks.getState().getLocalFolderLoadState(notebook.id).status !== "ready") return tab;
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tab.id);
  if (!state) return tab;
  const pages = usePages.getState().pages;
  const leaves = walkLeaves(state.root);
  if (!leaves.some((leaf) => pages[leaf.pageId])) return tab;
  for (const leaf of leaves) {
    if (!pages[leaf.pageId]) split.closePane(tab.id, leaf.id);
  }
  if (pages[tab.pageId]) return tab;
  const fallbackId = split.focusedPageId(tab.id);
  const fallback = fallbackId ? pages[fallbackId] : undefined;
  return fallback ? { ...tab, pageId: fallback.id, workspaceId: fallback.workspaceId } : tab;
}
