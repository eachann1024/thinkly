import { readFileSync } from "node:fs";
import path from "node:path";
import {
  adoptLegacyZoom,
  maximizedPaneAfterFocus,
  maximizedPaneAfterTreeChange,
  planMovePaneToNewTab,
  retainOnlyPane,
  toggleMaximizedPaneId,
} from "@/lib/editor-split/paneMaximize";
import { replacedDraftStillReferenced } from "@/lib/editor-split/pageReferences";
import { closeLeaf, walkLeaves } from "@/lib/editor-split/tree";
import type { SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

function leafIds(state: SplitState): string {
  return walkLeaves(state.root).map((leaf) => `${leaf.id}:${leaf.pageId}`).join(",");
}

const pair: SplitState = {
  root: {
    kind: "group",
    id: "g",
    orientation: "horizontal",
    sizes: [40, 60],
    children: [
      { kind: "leaf", id: "left", pageId: "page-a" },
      { kind: "leaf", id: "right", pageId: "page-b" },
    ],
  },
  focusedLeafId: "left",
  zoomedLeafId: null,
};

const triple: SplitState = {
  root: {
    kind: "group",
    id: "row",
    orientation: "horizontal",
    sizes: [20, 30, 50],
    children: [
      { kind: "leaf", id: "left", pageId: "page-a" },
      { kind: "leaf", id: "mid", pageId: "draft" },
      { kind: "leaf", id: "right", pageId: "page-b" },
    ],
  },
  focusedLeafId: "mid",
  zoomedLeafId: null,
};

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 放大不改布局树");
  const before = JSON.stringify(pair);
  const maximized = toggleMaximizedPaneId(pair, null, "right");
  check("放大只记下格子，树和尺寸不动", maximized === "right" && JSON.stringify(pair) === before && pair.root.kind === "group" && pair.root.sizes.join(",") === "40,60");
  check("同一格再切换就还原", toggleMaximizedPaneId(pair, maximized, "right") === null && JSON.stringify(pair) === before);
  check("只剩一格不能放大", toggleMaximizedPaneId({ ...pair, root: pair.root.kind === "group" ? pair.root.children[0] : pair.root }, null, "left") === null);
  check("放大时焦点换到别的格，占满跟着走", maximizedPaneAfterFocus(pair, "left", "right") === "right");
  check("没放大时换焦点不产生占满", maximizedPaneAfterFocus(pair, null, "right") === null);
  const legacy = { ...pair, zoomedLeafId: "left" as const };
  const adopted = adoptLegacyZoom({ tab: legacy });
  check("旧缩放并进临时放大，树和尺寸不动", adopted.maximizedPaneIdByTab.tab === "left" && adopted.byTabId.tab?.zoomedLeafId === null && legacy.zoomedLeafId === "left" && adopted.byTabId.tab.root === pair.root);
  const adoptedOne = adoptLegacyZoom({
    tab: { root: { kind: "leaf", id: "only", pageId: "page-a" }, focusedLeafId: "only", zoomedLeafId: "only" },
  });
  check("只剩一格的旧缩放直接还原", adoptedOne.maximizedPaneIdByTab.tab === undefined && adoptedOne.byTabId.tab?.zoomedLeafId === null);

  console.log("· 关闭后自动还原");
  const closedMaximized = closeLeaf(triple, "mid");
  check("关掉被放大的格就还原", closedMaximized.kind === "updated" && maximizedPaneAfterTreeChange(closedMaximized.state, "mid") === null);
  const closedOther = closeLeaf(triple, "left");
  check("关掉别的格后放大还在", closedOther.kind === "updated" && maximizedPaneAfterTreeChange(closedOther.state, "mid") === "mid");
  const closedToOne = closeLeaf(pair, "left");
  check("只剩一格时还原", closedToOne.kind === "updated" && maximizedPaneAfterTreeChange(closedToOne.state, "right") === null && JSON.stringify(pair) === before);

  console.log("· 关闭其他");
  const tripleBefore = JSON.stringify(triple);
  const only = retainOnlyPane(triple, "mid");
  check("原树不被改写", JSON.stringify(triple) === tripleBefore);
  check("只留下目标格", only?.root.kind === "leaf" && only.root.id === "mid" && only.root.pageId === "draft" && only.focusedLeafId === "mid" && only.zoomedLeafId === null);
  check("已经只剩一格则不动", retainOnlyPane(pair, "missing") === null && retainOnlyPane({ root: { kind: "leaf", id: "only", pageId: "page-a" }, focusedLeafId: "only", zoomedLeafId: null }, "only")?.root.kind === "leaf");

  console.log("· 移到新标签");
  const moved = planMovePaneToNewTab({
    tabId: "tab-1",
    leafId: "left",
    state: triple,
    tabs: [{ id: "tab-1", pageId: "draft" }, { id: "tab-keep", pageId: "page-c" }],
    newTabId: "tab-2",
  });
  check("新标签激活且笔记离开原格", moved?.activeTabId === "tab-2" && moved.movedPageId === "page-a" && moved.tabs.some((tab) => tab.id === "tab-2" && tab.pageId === "page-a") && moved.source !== null && !leafIds(moved.source).includes("left:"));
  check("来源标签改指向剩余焦点，其它标签还在", moved?.sourceTabPageId === "draft" && moved.tabs.find((tab) => tab.id === "tab-1")?.pageId === "draft" && moved.tabs.some((tab) => tab.id === "tab-keep"));
  check("原树仍在", JSON.stringify(triple) === tripleBefore);
  const last = planMovePaneToNewTab({
    tabId: "tab-1",
    leafId: "only",
    state: { root: { kind: "leaf", id: "only", pageId: "page-a" }, focusedLeafId: "only", zoomedLeafId: "only" },
    tabs: [{ id: "tab-1", pageId: "page-a" }],
    newTabId: "tab-2",
  });
  check("只剩一格时关掉来源标签", last?.removeTabId === "tab-1" && last.source === null && last.activeTabId === "tab-2" && last.tabs.map((tab) => tab.id).join(",") === "tab-2");

  console.log("· 空草稿仍被引用时不丢弃");
  check("同一标签的其它格还开着", replacedDraftStillReferenced("draft", [
    { tabId: "tab-1", pageId: "page-b", leafPageIds: ["page-b", "draft"] },
  ], "tab-1"));
  check("其它标签还开着", replacedDraftStillReferenced("draft", [
    { tabId: "tab-1", pageId: "page-b", leafPageIds: ["page-b"] },
    { tabId: "tab-2", pageId: "draft", leafPageIds: [] },
  ], "tab-1"));
  check("只剩当前标签尚未同步的 pageId 时可以丢弃", !replacedDraftStillReferenced("draft", [
    { tabId: "tab-1", pageId: "draft", leafPageIds: ["page-b"] },
  ], "tab-1"));
  const source = readFileSync(path.join(process.cwd(), "src/lib/editor-split/replacePanePage.ts"), "utf8");
  check("换页会先问是否仍被引用", source.includes("replacedDraftStillReferenced") && source.includes("collectOpenedPagePlaces"));

  console.log("· 放大只有一套状态");
  const storeSource = readFileSync(path.join(process.cwd(), "src/stores/useEditorSplit.ts"), "utf8");
  const zoomStart = storeSource.indexOf("toggleZoom:");
  const zoomFn = storeSource.slice(zoomStart, storeSource.indexOf("toggleMaximizePane:", zoomStart));
  const surface = readFileSync(path.join(process.cwd(), "src/pages/workspace/components/editor-split/EditorSplitSurface.tsx"), "utf8");
  const commands = readFileSync(path.join(process.cwd(), "src/lib/editor-split/commands.ts"), "utf8");
  const hotkeys = readFileSync(path.join(process.cwd(), "src/hooks/appHotkeys/split.ts"), "utf8");
  const menu = readFileSync(path.join(process.cwd(), "src/pages/workspace/components/editor-split/SplitPaneMoreMenu.tsx"), "utf8");
  check("旧快捷键和命令写入临时放大", zoomFn.includes("get().toggleMaximizePane") && commands.includes("useEditorSplit.getState().toggleZoom(tab.id)") && hotkeys.includes("toggleZoom()"));
  check("放大不再卸掉其它格", !surface.includes("editor-split-surface--zoomed"));
  check("菜单放大仍走同一入口", menu.includes("toggleMaximizePane(tabId, leafId)"));

  return checker.failed;
}
