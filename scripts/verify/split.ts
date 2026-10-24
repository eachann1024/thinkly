import { readFileSync } from "node:fs";
import path from "node:path";
import { replaceSplitLeafPage, splitPaneAcceptsPage } from "@/lib/editor-split/panePage";
import {
  splitSwitcherEntries,
  type SplitSwitcherPage,
} from "@/lib/editor-split/switcherEntries";
import { walkLeaves } from "@/lib/editor-split/tree";
import type { SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

function page(
  partial: Partial<SplitSwitcherPage> & Pick<SplitSwitcherPage, "id" | "title">,
): SplitSwitcherPage {
  return { workspaceId: "nb", createdAt: 1, ...partial };
}

function leafPage(state: SplitState, leafId: string): string | undefined {
  return walkLeaves(state.root).find((leaf) => leaf.id === leafId)?.pageId;
}

const split: SplitState = {
  root: {
    kind: "group",
    id: "g",
    orientation: "horizontal",
    sizes: [50, 50],
    children: [
      { kind: "leaf", id: "left", pageId: "page-a" },
      { kind: "leaf", id: "right", pageId: "page-b" },
    ],
  },
  focusedLeafId: "left",
  zoomedLeafId: "left",
};

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 替换分屏页面");
  const before = JSON.stringify(split);
  const replaced = replaceSplitLeafPage(split, "right", "page-c");
  check("原树不被改写", JSON.stringify(split) === before);
  check("只改目标格", replaced?.previousPageId === "page-b" && leafPage(replaced!.state, "right") === "page-c" && leafPage(replaced!.state, "left") === "page-a");
  check("聚焦目标格，放大跟随", replaced?.state.focusedLeafId === "right" && replaced.state.zoomedLeafId === "right");
  const duplicated = replaceSplitLeafPage(replaced!.state, "left", "page-c");
  check("另一格已打开同一页时两边都保留", leafPage(duplicated!.state, "left") === "page-c" && leafPage(duplicated!.state, "right") === "page-c" && duplicated?.state.focusedLeafId === "left");
  const refocus = replaceSplitLeafPage(duplicated!.state, "right", "page-c");
  check("同一页再次选中只移动焦点", refocus?.state.focusedLeafId === "right" && leafPage(refocus!.state, "left") === "page-c" && leafPage(refocus!.state, "right") === "page-c");
  check("不存在的格子拒绝", replaceSplitLeafPage(split, "missing", "page-c") === null);

  console.log("· 文件夹不能进分屏");
  check("文件夹拒绝", splitPaneAcceptsPage({ isFolder: true }) === false);
  check("回收站页拒绝", splitPaneAcceptsPage({ trashedAt: 1 }) === false);
  check("空页面拒绝", splitPaneAcceptsPage(null) === false && splitPaneAcceptsPage(undefined) === false);
  check("普通笔记可以", splitPaneAcceptsPage({ isFolder: false }) === true);

  console.log("· 同级切换列表");
  const pages = [
    page({ id: "b", title: "计划", order: 2, createdAt: 2 }),
    page({ id: "a", title: "周会", order: 0, createdAt: 3 }),
    page({ id: "folder", title: "资料", order: 1, createdAt: 1, isFolder: true }),
    page({ id: "note", title: "纪要", parentId: "folder", createdAt: 4 }),
    page({ id: "nested", title: "归档", parentId: "folder", isFolder: true, createdAt: 5 }),
    page({ id: "old", title: "旧稿", parentId: "nested", createdAt: 6 }),
    page({ id: "other", title: "别处", parentId: "somewhere", createdAt: 7 }),
    page({ id: "foreign", title: "别的本", workspaceId: "nb2", createdAt: 8 }),
    page({ id: "trash", title: "垃圾", trashedAt: 9, createdAt: 9 }),
    page({ id: "draft", title: "草稿", editorDraft: true, createdAt: 10 }),
    page({ id: "unsaved", title: "未存", localUnsaved: true, createdAt: 11 }),
    page({ id: "root-blank", title: "空父级", parentId: "", order: 3, createdAt: 12 }),
  ];
  const siblings = splitSwitcherEntries(pages, { workspaceId: "nb", parentId: undefined }, "siblings");
  check("同父级按顺序，空父级算根", siblings.map((item) => item.id).join(",") === "a,folder,b,root-blank");
  check("不含别的文件夹、别的本、回收站和草稿", !siblings.some((item) => ["other", "foreign", "trash", "draft", "unsaved", "note"].includes(item.id)));
  const folder = siblings.find((item) => item.id === "folder");
  check("子文件夹展开后才能选到里面的文件", folder?.isFolder === true && folder.children.map((item) => item.id).join(",") === "note,nested" && folder.children[1]?.children[0]?.id === "old");
  const fromChild = splitSwitcherEntries(pages, { workspaceId: "nb", parentId: "folder" }, "siblings");
  check("点笔记标题只列同一父级", fromChild.map((item) => item.id).join(",") === "note,nested");
  const fromRoot = splitSwitcherEntries(pages, { workspaceId: "nb", parentId: "folder" }, "notebook-root");
  check("点笔记本名列该本根级", fromRoot.map((item) => item.id).join(",") === siblings.map((item) => item.id).join(","));
  const local = splitSwitcherEntries(
    [page({ id: "file", title: "周会", createdAt: 1 }), page({ id: "dir", title: "资料", isFolder: true, createdAt: 2 })],
    { workspaceId: "nb" },
    "siblings",
    { localFolder: true },
  );
  check("本地文件夹里文件夹排在文件前", local.map((item) => item.id).join(",") === "dir,file");
  const manual = splitSwitcherEntries(
    [page({ id: "a", title: "周会" }), page({ id: "b", title: "计划" }), page({ id: "c", title: "附录" })],
    { workspaceId: "nb" },
    "notebook-root",
    { manualOrders: { root: ["b", "a"] } },
  );
  check("根级手动顺序优先，其余排在后面", manual.map((item) => item.id).join(",") === "b,a,c");

  console.log("· 选中描边");
  const css = readFileSync(path.join(process.cwd(), "src/pages/workspace/styles/editor-split.css"), "utf8");
  const idle = css.match(/\.editor-split-surface\[data-editor-split="true"\] \.editor-split-pane \{[\s\S]*?\}/);
  const focused = css.match(/\.editor-split-pane\[data-focused="true"\]::after \{[\s\S]*?\}/);
  check("选中使用 1px accent 内阴影", Boolean(focused?.[0].includes("box-shadow: inset 0 0 0 1px var(--goose-accent-solid)")) && !/border\s*:/.test(focused?.[0] ?? "") && !focused?.[0].includes("--ring"));
  check("未选中分屏无描边", Boolean(idle) && !/box-shadow|border\s*:/.test(idle?.[0] ?? ""));
  check("分屏样式不再用 --ring 或 --border", !css.includes("var(--ring)") && !css.includes("var(--border)"));

  return checker.failed;
}
