/**
 * 块把手拖动只搬正文，不在格子边缘开分屏。
 * 大文档的轻量拖动只带 text/plain，以前会被当成外部文本。
 * 运行：node scripts/verify/run.mjs block-handle-drag
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  beginBlockHandleDrag,
  dragStartedFromBlockGrip,
  endBlockHandleDrag,
  GOOSE_BLOCK_DRAG_MIME,
  isBlockHandleDrag,
  isInEditorMoveDrag,
  markBlockHandleDrag,
} from "@/lib/editor-split/blockHandleDrag";
import { isSidebarPageDrag } from "@/lib/editor-split/sidebarPageDrop";
import { GOOSE_PAGE_MIME, GOOSE_TEXT_MIME, hasWorkspaceDrag } from "@/lib/workspace-drag";
import { createChecker } from "./lib/check";

function transfer(initial: string[] = []) {
  const types = [...initial];
  const store = new Map<string, string>();
  for (const type of types) store.set(type, "");
  return {
    types,
    setData(type: string, value: string) {
      store.set(type, value);
      if (!types.includes(type)) types.push(type);
    },
    getData(type: string) {
      return store.get(type) ?? "";
    },
  } as DataTransfer;
}

function grip(match: boolean): EventTarget {
  return { closest: () => (match ? {} : null) } as unknown as EventTarget;
}

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

export default function run(): number {
  const checker = createChecker();
  const { check } = checker;
  endBlockHandleDrag();

  const plain = ["text/plain"];
  check("外部纯文本仍可分屏", hasWorkspaceDrag(transfer(plain)) && !isInEditorMoveDrag(plain));
  check("BlockNote 搬块不开分屏", isInEditorMoveDrag(["blocknote/html", "text/html", "text/plain"]));
  check("正文选区不开分屏", isInEditorMoveDrag([GOOSE_TEXT_MIME, "text/plain"]));
  check("侧栏笔记仍走自己的落区", isSidebarPageDrag([GOOSE_PAGE_MIME]) && !isInEditorMoveDrag([GOOSE_PAGE_MIME]));

  check("把手元素算这次拖动", dragStartedFromBlockGrip(grip(true)));
  check("加号和正文不算把手", !dragStartedFromBlockGrip(grip(false)) && !dragStartedFromBlockGrip(null));

  beginBlockHandleDrag();
  check("把手拖动进行中", isBlockHandleDrag() && isInEditorMoveDrag(plain));
  endBlockHandleDrag();
  check("松手后纯文本恢复可分屏", !isBlockHandleDrag() && !isInEditorMoveDrag(plain) && hasWorkspaceDrag(transfer(plain)));

  const heavy = transfer();
  heavy.setData("text/plain", "账号归档");
  markBlockHandleDrag(heavy);
  check("轻量拖动带上块标记", heavy.types.includes(GOOSE_BLOCK_DRAG_MIME) && heavy.getData(GOOSE_BLOCK_DRAG_MIME) === "1");
  check("轻量拖动的纯文本不开分屏", isInEditorMoveDrag(Array.from(heavy.types)));
  check("轻量拖动仍被其它落点当成工作区内容拒绝", hasWorkspaceDrag(heavy));

  const menu = read("src/components/editor/core/EditorSideMenu.tsx");
  const heavyDrag = read("src/components/editor/core/lightweightBlockDrag.ts");
  const surface = read("src/pages/workspace/components/editor-split/SplitContentDropSurface.tsx");
  const start = menu.slice(menu.indexOf("const handleDragStart"));
  const beginAt = start.indexOf("beginBlockHandleDrag()");
  const heavyAt = start.indexOf("startHeavyBlockDrag");
  const noteAt = start.indexOf("blockDragStart");
  const markAt = start.indexOf("markBlockHandleDrag");
  check("起拖先标记，再走轻量或 BlockNote", beginAt !== -1 && heavyAt > beginAt && noteAt > heavyAt && markAt > noteAt);
  check("轻量拖动写块标记", heavyDrag.includes("markBlockHandleDrag(data)"));
  const over = surface.slice(surface.indexOf("const over"));
  const drop = surface.slice(surface.indexOf("const drop"));
  check("拖过和放下都先放过后块移动", over.indexOf("isEditorDrag") !== -1 && over.indexOf("isEditorDrag") < over.indexOf("hasWorkspaceDrag") && drop.indexOf("isEditorDrag") !== -1 && drop.indexOf("isEditorDrag") < drop.indexOf("hasWorkspaceDrag"));

  endBlockHandleDrag();
  return checker.failed;
}
