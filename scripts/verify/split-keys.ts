import { walkLeaves } from "@/lib/editor-split/tree";
import { neighborLeaf } from "@/lib/editor-split/treeGeometry";
import { applyLayoutPreset, equalizeSplitSizes } from "@/lib/editor-split/layoutPreset";
import { swapWithNeighbor } from "@/lib/editor-split/swapNeighbor";
import type { SplitLeaf, SplitNode, SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

function leaf(id: string, pageId: string): SplitLeaf {
  return { kind: "leaf", id, pageId };
}

function state(root: SplitNode, focusedLeafId: string): SplitState {
  return { root, focusedLeafId, zoomedLeafId: null };
}

function pages(root: SplitNode): string {
  return walkLeaves(root).map((item) => item.pageId).join(",");
}

function shape(node: SplitNode): string {
  if (node.kind === "leaf") return node.pageId;
  return `${node.orientation[0]}(${node.children.map(shape).join(",")})`;
}

function groupSizes(node: SplitNode): number[][] {
  if (node.kind === "leaf") return [];
  return [node.sizes, ...node.children.flatMap(groupSizes)];
}

const irregular = state({
  kind: "group",
  id: "root",
  orientation: "horizontal",
  sizes: [30, 70],
  children: [
    leaf("a", "A"),
    {
      kind: "group",
      id: "right",
      orientation: "vertical",
      sizes: [40, 60],
      children: [
        leaf("b", "B"),
        {
          kind: "group",
          id: "bottom",
          orientation: "horizontal",
          sizes: [50, 50],
          children: [leaf("c", "C"), leaf("d", "D")],
        },
      ],
    },
  ],
}, "a");

let seq = 0;
const ids = {
  leaf: () => `new-${++seq}`,
  group: () => `group-${++seq}`,
};

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 相邻格");
  const neighbor = (id: string, dir: "left" | "right" | "up" | "down") =>
    neighborLeaf({ ...irregular, focusedLeafId: id }, id, dir)?.pageId ?? "";
  check("不规则布局向右取重叠更大的一格", neighbor("a", "right") === "C");
  check("A 的左、上、下都没有相邻格", neighbor("a", "left") === "" && neighbor("a", "up") === "" && neighbor("a", "down") === "");
  check("B 左侧是 A，下方重叠相同时取更靠左的 C", neighbor("b", "left") === "A" && neighbor("b", "down") === "C");
  check("B 的右和上都没有相邻格", neighbor("b", "right") === "" && neighbor("b", "up") === "");
  check("C 左 A、右 D、上 B，下方没有", neighbor("c", "left") === "A" && neighbor("c", "right") === "D" && neighbor("c", "up") === "B" && neighbor("c", "down") === "");
  check("D 左 C、上 B，右和下没有", neighbor("d", "left") === "C" && neighbor("d", "up") === "B" && neighbor("d", "right") === "" && neighbor("d", "down") === "");
  const alone = state(leaf("only", "A"), "only");
  check("单格四个方向都没有相邻格", (["left", "right", "up", "down"] as const).every((dir) => neighborLeaf(alone, "only", dir) === null));

  console.log("· 交换");
  const pair = state({
    kind: "group",
    id: "pair",
    orientation: "horizontal",
    sizes: [40, 60],
    children: [leaf("left", "A"), leaf("right", "B")],
  }, "left");
  const before = JSON.stringify(pair);
  const swapped = swapWithNeighbor(pair, "right");
  check("原树不被改写", JSON.stringify(pair) === before);
  check("向右交换后笔记对调", pages(swapped.root) === "B,A");
  check("没有相邻格时保持原位", swapWithNeighbor(pair, "left") === pair);
  const fromC = swapWithNeighbor({ ...irregular, focusedLeafId: "c" }, "up");
  check("嵌套布局向上交换后 B 与 C 对调", pages(fromC.root) === "A,C,B,D");
  check("边界没有相邻格时不交换", swapWithNeighbor(irregular, "left") === irregular);

  console.log("· 布局预设");
  const row = state({
    kind: "group",
    id: "row",
    orientation: "horizontal",
    sizes: [25, 25, 25, 25],
    children: [leaf("1", "A"), leaf("2", "B"), leaf("3", "C"), leaf("4", "D")],
  }, "3");
  const columns = applyLayoutPreset(row, "columns", [], ids);
  check("左右两栏保留前两篇并关掉后面的笔记", columns?.droppedPageIds.join(",") === "C,D" && pages(columns.state.root) === "A,B" && shape(columns.state.root) === "h(A,B)");
  check("左右两栏均分", columns?.state.root.kind === "group" && columns.state.root.sizes.join(",") === "50,50");
  const rows = applyLayoutPreset(row, "rows", [], ids);
  check("上下两栏是纵向且笔记顺序仍是前两篇", rows && shape(rows.state.root) === "v(A,B)" && pages(rows.state.root) === "A,B" && rows.droppedPageIds.join(",") === "C,D");
  const two = state({
    kind: "group",
    id: "two",
    orientation: "vertical",
    sizes: [70, 30],
    children: [leaf("1", "A"), leaf("2", "B")],
  }, "1");
  const grid = applyLayoutPreset(two, "grid", ["X", "Y"], ids);
  check("四宫格按阅读顺序接上补位笔记", grid && shape(grid.state.root) === "v(h(A,B),h(X,Y))" && pages(grid.state.root) === "A,B,X,Y" && grid.droppedPageIds.length === 0);
  check("补不满时不改树", applyLayoutPreset(two, "grid", ["X"], ids) === null);
  check("被关掉的笔记仍留在返回值里", columns?.droppedPageIds.join(",") === "C,D");

  console.log("· 均分");
  const uneven = equalizeSplitSizes(irregular);
  check("各组尺寸变成均分", groupSizes(uneven.root).every((sizes) => sizes.length === 2 && sizes[0] === 50 && sizes[1] === 50));
  check("均分不改笔记顺序和叶子", pages(uneven.root) === "A,B,C,D" && walkLeaves(uneven.root).map((item) => item.id).join(",") === "a,b,c,d");
  check("已经均分时保持原对象", equalizeSplitSizes(uneven) === uneven);

  return checker.failed;
}
