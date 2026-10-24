import { flushSync } from "react-dom";
import { focusSplitPane } from "@/lib/editor-split/commands";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { flushEditorContent } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { snapshotCurrentSelection, restoreSelectionAfterFormat } from "@/components/editor/toolbars/formatting/selectionRestore";
import type { EditorPaneRegistry } from "./editorPaneRegistry";
import type { SplitDropTarget } from "./splitDropGeometry";

export function commitPaneMove(
  tabId: string,
  sourceId: string,
  target: SplitDropTarget,
  registry: EditorPaneRegistry | null,
  focusEditor: boolean,
) {
  const snapshots = registry?.getAllEntries().map((entry) => ({
    paneId: entry.paneId,
    pageId: entry.pageId,
    top: entry.scrollEl?.scrollTop ?? 0,
    selection: entry.editor ? snapshotCurrentSelection(entry.editor) : null,
  })) ?? [];
  flushEditorContent(true);
  let moved = false;
  flushSync(() => {
    moved = useEditorSplit.getState().movePane(tabId, sourceId, target.paneId, target.placement);
    if (moved) focusSplitPane(tabId, sourceId, { focusEditor: false });
  });
  if (!moved) return;
  const committedRoot = useEditorSplit.getState().getStateForTab(tabId)?.root;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (useTabs.getState().activeTabId !== tabId ||
        useEditorSplit.getState().getStateForTab(tabId)?.root !== committedRoot) return;
    for (const saved of snapshots) {
      const entry = registry?.getAllEntries().find((item) => item.paneId === saved.paneId && item.pageId === saved.pageId);
      if (!entry) continue;
      if (entry.editor && saved.selection) restoreSelectionAfterFormat(entry.editor, saved.selection);
      if (focusEditor && entry.paneId === sourceId) entry.editor?.prosemirrorView?.focus();
      if (entry.scrollEl) entry.scrollEl.scrollTop = saved.top;
    }
  }));
}
