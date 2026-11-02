import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTabs } from "@/stores/useTabs";
import { useEffectiveSingleTabMode } from "@/lib/tabMode";
import { EditorActivity } from "@/components/editor/core/EditorActivity";
import { EditorSplitSurface } from "./EditorSplitSurface";
import { SplitEditorPane } from "./SplitEditorPane";
import { useEditorSplitSelector } from "@/stores/useEditorSplit";
import { isSplitState } from "@/lib/editor-split/tree";

export const DEFAULT_EDITOR_TAB_CACHE_SIZE = 6;

function CachedTabSurface({ tabId }: { tabId: string }) {
  const split = useEditorSplitSelector(state => state.byTabId[tabId] ?? null, Object.is);
  const showChrome = split ? isSplitState(split) : false;
  return (
    <EditorSplitSurface tabId={tabId} renderPane={(leaf, { focused }) => (
      <SplitEditorPane tabId={tabId} leaf={leaf} focused={focused} showChrome={showChrome} />
    )} />
  );
}

export function CachedEditorSplitSurfaces({
  visible,
  capacity = DEFAULT_EDITOR_TAB_CACHE_SIZE,
}: { visible: boolean; capacity?: number }) {
  const { openTabs, activeTabId } = useTabs(useShallow(state => ({
    openTabs: state.openTabs, activeTabId: state.activeTabId,
  })));
  const singleTabMode = useEffectiveSingleTabMode();
  const limit = singleTabMode ? 1 : Math.max(1, Math.floor(capacity));
  const [visited, setVisited] = useState<string[]>([]);
  const eligible = new Set(openTabs.filter(tab => !tab.type).map(tab => tab.id));
  const active = visible && activeTabId && eligible.has(activeTabId) ? activeTabId : null;
  const next = visited.filter(id => eligible.has(id) && id !== active);
  if (active) next.push(active);
  const retained = next.slice(-limit);
  if (retained.length !== visited.length || retained.some((id, index) => id !== visited[index])) {
    setVisited(retained);
  }
  return retained.map(tabId => (
    <EditorActivity key={tabId} visible={tabId === active}>
      <CachedTabSurface tabId={tabId} />
    </EditorActivity>
  ));
}
