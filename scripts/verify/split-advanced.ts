import { readFileSync } from "node:fs";
import {
  advancedSplitShortcutsForCurrentPlatform,
  splitShortcutsForCurrentPlatform,
} from "@/pages/workspace/components/sidebar/settings/shortcut-settings/sections/shortcutGroups";
import { paneKeepsOwnContextMenu } from "@/pages/workspace/components/editor-split/PaneSplitMenu";
import { applySidebarPageDrop } from "@/lib/editor-split/sidebarPageDrop";
import { walkLeaves } from "@/lib/editor-split/tree";
import type { SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

const { check, failed } = createChecker();
const primary = splitShortcutsForCurrentPlatform().map((item) => item.label);
const advanced = advancedSplitShortcutsForCurrentPlatform().map((item) => item.label);

check("常用分屏仍直接列出", primary.includes("向右分屏") && primary.includes("向下分屏") && primary.includes("关闭当前分屏"));
check(
  "焦点移动折进进阶用法",
  ["焦点移到左侧", "焦点移到右侧", "焦点移到上方", "焦点移到下方", "上一个分屏", "下一个分屏"]
    .every((label) => advanced.includes(label) && !primary.includes(label)),
  { primary, advanced },
);
check("交换位置也折进进阶用法", advanced.filter((label) => label.includes("交换")).length === 4);

const settings = readFileSync(
  "src/pages/workspace/components/sidebar/settings/shortcut-settings/renderShortcutSettingsColumns.tsx",
  "utf8",
);
const referenceAt = settings.lastIndexOf("<ShortcutReference");
const advancedAt = settings.indexOf("<CollapsibleShortcutSection");
check(
  "进阶用法渲染在分屏列表下面且默认折叠",
  settings.includes("advancedSplitShortcutsForCurrentPlatform") &&
    referenceAt >= 0 && advancedAt > referenceAt,
  { referenceAt, advancedAt },
);

function single(): SplitState {
  return { root: { kind: "leaf", id: "only", pageId: "current" }, focusedLeafId: "only", zoomedLeafId: null };
}

const opened = applySidebarPageDrop(single(), "only", "right", "picked", { isFolder: false });
check("单格右侧打开已有笔记并聚焦新格", opened.ok && opened.focusedLeafId !== "only");
if (opened.ok) {
  const leaves = walkLeaves(opened.state.root);
  check("原笔记留在左格", leaves[0]?.pageId === "current" && leaves[1]?.pageId === "picked", leaves);
}
const below = applySidebarPageDrop(single(), "only", "bottom", "picked", { isFolder: false });
check("单格下方打开", below.ok && below.state.root.kind === "group" && below.state.root.orientation === "vertical");
check("文件夹不能打开成分屏", !applySidebarPageDrop(single(), "only", "right", "folder", { isFolder: true }).ok);

class FakeElement {
  closest(selector: string) { return selector.includes(".bn-editor") ? this : null; }
}
const dom = new Function("return this")();
if (!dom.Element) dom.Element = FakeElement;
check("正文右键不交给分屏菜单", paneKeepsOwnContextMenu(new FakeElement() as unknown as EventTarget));
check("格子空白处交给分屏菜单", !paneKeepsOwnContextMenu({ closest: () => null } as unknown as EventTarget));

const sidebar = readFileSync(
  "src/pages/workspace/components/sidebar/sidebar-context-menu/groups/appendSidebarOpenMoveGroups.tsx",
  "utf8",
);
check(
  "侧栏右键提供两个方向",
  sidebar.includes('openPageBeside(page.id, "right")') && sidebar.includes('openPageBeside(page.id, "bottom")'),
);
const header = readFileSync("src/pages/workspace/components/editor-split/SplitPaneMoreMenu.tsx", "utf8");
check("分屏标题菜单也能按方向打开当前笔记", header.includes('openPageBeside(page.id, "right")'));

export default function run() {
  return failed;
}
