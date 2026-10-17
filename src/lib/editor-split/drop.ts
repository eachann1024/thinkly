import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/editor-split/drop.ts#localMessages:1">`
zh-Hans:
  youCanOpenUpToPanes: "最多只能分成 4 格"
  thisNoteIsNoLongerAvailable: "这篇笔记已不可用"
en:
  youCanOpenUpToPanes: "You can open up to 4 panes"
  thisNoteIsNoLongerAvailable: "This note is no longer available"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { flushEditorContent, usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import type { WorkspaceDragPayload } from "@/lib/workspace-drag";
import { createSplitBlankPage } from "./createBlankPage";
import { focusSplitPane } from "./commands";
import { canSplitCurrentView, isLiveEditorPage } from "./commandContext";
import { countLeaves, findLeaf, MAX_SPLIT_LEAVES, splitLeaf } from "./tree";
import type { SplitLeaf, SplitNode } from "./types";

export type SplitContentPlacement = "left" | "right" | "top" | "bottom";

function swapNewLeaf(node: SplitNode, source: SplitLeaf, added: SplitLeaf): SplitNode {
  if (node.kind === "leaf") {
    return node.id === source.id ? added : node.id === added.id ? source : node;
  }
  return { ...node, children: node.children.map((child) => swapNewLeaf(child, source, added)) };
}

function droppedTextContent(payload: Extract<WorkspaceDragPayload, { kind: "text" }>) {
  if (payload.language) {
    return [{
      type: "codeBlock",
      props: { language: payload.language },
      content: [{ type: "text", text: payload.text, styles: {} }],
    }];
  }
  return payload.text.split(/\r?\n/).map((text) => ({
    type: "paragraph",
    content: text ? [{ type: "text", text, styles: {} }] : [],
  }));
}

/** Drop only copies content; it never moves or deletes the source document. */
export async function dropWorkspaceContent(
  tabId: string,
  paneId: string,
  placement: SplitContentPlacement,
  payload: WorkspaceDragPayload,
): Promise<boolean> {
  const blocked = canSplitCurrentView();
  if (blocked || useTabs.getState().activeTabId !== tabId) {
    if (blocked) toast.error(blocked);
    return false;
  }
  flushEditorContent(true);
  const current = useEditorSplit.getState().getStateForTab(tabId);
  const target = current && findLeaf(current.root, paneId);
  if (!current || !target) return false;
  if (countLeaves(current.root) >= MAX_SPLIT_LEAVES) {
    toast.error(uiText("youCanOpenUpToPanes"));
    return false;
  }
  if (payload.kind === "text" && !payload.text.trim()) return false;
  if (payload.kind === "page" && !isLiveEditorPage(usePages.getState().getPage(payload.pageId))) {
    toast.error(uiText("thisNoteIsNoLongerAvailable"));
    return false;
  }
  const newPageId = payload.kind === "page"
    ? payload.pageId
    : await createSplitBlankPage(target.pageId);
  if (!newPageId) return false;
  // A navigation or another split during asynchronous creation invalidates this drop.
  if (useTabs.getState().activeTabId !== tabId ||
      useEditorSplit.getState().getStateForTab(tabId) !== current) {
    if (payload.kind === "text") usePages.getState().discardEditorDraftPage(newPageId);
    return false;
  }
  const result = splitLeaf(current, {
    leafId: paneId,
    direction: placement === "left" || placement === "right" ? "right" : "down",
    newPageId,
  });
  if (!result.ok) {
    if (payload.kind === "text") usePages.getState().discardEditorDraftPage(newPageId);
    toast.error(result.error);
    return false;
  }
  const added = findLeaf(result.state.root, result.newLeafId)!;
  const next = placement === "left" || placement === "top"
    ? { ...result.state, root: swapNewLeaf(result.state.root, target, added) }
    : result.state;
  useEditorSplit.setState((state) => ({ byTabId: { ...state.byTabId, [tabId]: next } }));
  if (payload.kind === "text") {
    usePages.getState().updatePage(newPageId, { content: droppedTextContent(payload) });
  }
  focusSplitPane(tabId, result.newLeafId);
  return true;
}
