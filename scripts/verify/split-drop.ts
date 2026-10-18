/**
 * 侧栏笔记拖入编辑区：落区、边缘新开格并聚焦、中央替换、满员禁止边缘、文件夹拒绝、单格可分屏。
 * 运行：node scripts/verify/run.mjs split-drop
 */
import { applySidebarPageDrop, resolveSidebarPageDrop } from "@/lib/editor-split/sidebarPageDrop";
import { walkLeaves } from "@/lib/editor-split/tree";
import type { SplitNode, SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

const note = { isFolder: false as const };
const box = { left: 0, top: 0, width: 100, height: 100 };

function single(): SplitState {
  return {
    root: { kind: "leaf", id: "only", pageId: "a" },
    focusedLeafId: "only",
    zoomedLeafId: null,
  };
}

function pair(): SplitState {
  return {
    root: {
      kind: "group",
      id: "g",
      orientation: "horizontal",
      sizes: [50, 50],
      children: [
        { kind: "leaf", id: "left", pageId: "a" },
        { kind: "leaf", id: "right", pageId: "b" },
      ],
    },
    focusedLeafId: "left",
    zoomedLeafId: null,
  };
}

function full(): SplitState {
  return {
    root: {
      kind: "group",
      id: "g",
      orientation: "horizontal",
      sizes: [25, 25, 25, 25],
      children: ["a", "b", "c", "d"].map((id) => ({ kind: "leaf" as const, id, pageId: id })),
    },
    focusedLeafId: "a",
    zoomedLeafId: null,
  };
}

function layout(node: SplitNode): string {
  if (node.kind === "leaf") return node.pageId;
  const axis = node.orientation === "horizontal" ? "h" : "v";
  return `${axis}(${node.children.map(layout).join(",")})`;
}

function focusedPage(state: SplitState): string | undefined {
  return walkLeaves(state.root).find((leaf) => leaf.id === state.focusedLeafId)?.pageId;
}

const ids = { newLeafId: "new", newGroupId: "ng" };

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const zone = (x: number, y: number, leafCount: number, folder = false) =>
    resolveSidebarPageDrop({ rect: box, x, y, leafCount, folder });

  check("左缘", zone(10, 50, 1) === "left");
  check("右缘", zone(90, 50, 1) === "right");
  check("上缘", zone(50, 10, 1) === "top");
  check("下缘", zone(50, 90, 1) === "bottom");
  check("中央", zone(50, 50, 1) === "center");
  check("恰好 28% 算中央", zone(28, 50, 1) === "center");
  check("27% 仍是左缘", zone(27, 50, 1) === "left");
  check("格外没有落点", zone(-1, 50, 1) === null && zone(101, 50, 1) === null);
  check("满员边缘没有落点", zone(10, 50, 4) === null && zone(90, 50, 4) === null && zone(50, 10, 4) === null && zone(50, 90, 4) === null);
  check("满员中央仍可替换", zone(50, 50, 4) === "center");
  check("文件夹没有落点", zone(50, 50, 1, true) === null && zone(10, 50, 1, true) === null);

  const origin = single();
  const before = JSON.stringify(origin);
  const right = applySidebarPageDrop(origin, "only", "right", "b", note, ids);
  const left = applySidebarPageDrop(origin, "only", "left", "b", note, ids);
  const bottom = applySidebarPageDrop(origin, "only", "bottom", "b", note, ids);
  const top = applySidebarPageDrop(origin, "only", "top", "b", note, ids);
  check("单格向右开分屏并聚焦新笔记", right.ok === true && layout(right.state.root) === "h(a,b)" && focusedPage(right.state) === "b" && right.focusedLeafId === "new");
  check("单格向左新笔记在左", left.ok === true && layout(left.state.root) === "h(b,a)" && focusedPage(left.state) === "b");
  check("单格向下新笔记在下", bottom.ok === true && layout(bottom.state.root) === "v(a,b)" && focusedPage(bottom.state) === "b");
  check("单格向上新笔记在上", top.ok === true && layout(top.state.root) === "v(b,a)" && focusedPage(top.state) === "b");
  check("单格原树不被改写", JSON.stringify(origin) === before);

  const panes = pair();
  const panesBefore = JSON.stringify(panes);
  const beside = applySidebarPageDrop(panes, "left", "left", "c", note, ids);
  const afterRight = applySidebarPageDrop(panes, "right", "right", "c", note, ids);
  const above = applySidebarPageDrop(panes, "left", "top", "c", note, ids);
  const below = applySidebarPageDrop(panes, "right", "bottom", "c", note, ids);
  check("已分屏时新格开在目标左侧并聚焦", beside.ok === true && layout(beside.state.root) === "h(c,a,b)" && focusedPage(beside.state) === "c");
  check("新格开在目标右侧", afterRight.ok === true && layout(afterRight.state.root) === "h(a,b,c)" && focusedPage(afterRight.state) === "c");
  check("新格开在目标上方", above.ok === true && layout(above.state.root) === "h(v(c,a),b)" && focusedPage(above.state) === "c");
  check("新格开在目标下方", below.ok === true && layout(below.state.root) === "h(a,v(b,c))" && focusedPage(below.state) === "c");

  const replaced = applySidebarPageDrop(panes, "right", "center", "c", note);
  check("中央只替换目标格并聚焦", replaced.ok === true && replaced.kind === "replace" && layout(replaced.state.root) === "h(a,c)" && focusedPage(replaced.state) === "c" && replaced.focusedLeafId === "right");
  check("替换不改原树", JSON.stringify(panes) === panesBefore);

  const capped = full();
  const cappedBefore = JSON.stringify(capped);
  const blocked = applySidebarPageDrop(capped, "a", "left", "z", note, ids);
  const swapped = applySidebarPageDrop(capped, "b", "center", "z", note);
  check("满员禁止边缘开格", blocked.ok === false && blocked.reason === "full" && JSON.stringify(capped) === cappedBefore);
  check("满员中央仍替换并聚焦", swapped.ok === true && layout(swapped.state.root) === "h(a,z,c,d)" && focusedPage(swapped.state) === "z" && swapped.focusedLeafId === "b");

  const folder = applySidebarPageDrop(panes, "right", "center", "folder", { isFolder: true });
  const trashed = applySidebarPageDrop(panes, "right", "left", "gone", { trashedAt: 1 }, ids);
  check("文件夹拒绝且不改树", folder.ok === false && folder.reason === "folder" && JSON.stringify(panes) === panesBefore);
  check("回收站页拒绝", trashed.ok === false && trashed.reason === "rejected" && JSON.stringify(panes) === panesBefore);
  check("没有的格子拒绝", applySidebarPageDrop(panes, "missing", "center", "c", note).ok === false);

  return checker.failed;
}
