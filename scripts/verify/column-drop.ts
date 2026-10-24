import { Schema, type Node as PMNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { history, undo, redo } from "prosemirror-history";
import { columnDropTransaction } from "@/components/editor/blocks/columns/columnDropTransaction";
import { columnDropSide } from "@/components/editor/blocks/columns/columnDropTarget";
import { columnStructurePlugin } from "@/components/editor/blocks/columns/columnStructure";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { splitGeneratedMarkdown } from "@/lib/export/markdown/noteMeta";
import { createChecker } from "./lib/check";
import { readFileSync } from "node:fs";
import { beginColumnDrag, columnDragIds, completeColumnDrop, endColumnDrag, finishColumnDrag } from "@/components/editor/blocks/columns/columnDragSession";

const schema = new Schema({ nodes: {
  doc: { content: "blockGroup" }, blockGroup: { content: "blockContainer+" },
  blockContainer: { content: "blockContent blockGroup?", attrs: { id: { default: null } } },
  paragraph: { group: "blockContent", content: "text*" },
  heading: { group: "blockContent", content: "text*", attrs: { level: { default: 2 } } },
  bulletListItem: { group: "blockContent", content: "text*" },
  columnLayout: { group: "blockContent", attrs: { widths: { default: "50,50" } } },
  columnSection: { group: "blockContent" }, text: { group: "inline" },
} });
const block = (id: string, type = "paragraph", children: PMNode[] = [], props = {}) => schema.nodes.blockContainer.create({ id }, [
  schema.nodes[type].create(props, ["columnLayout", "columnSection"].includes(type) ? null : schema.text(id)),
  ...(children.length ? [schema.nodes.blockGroup.create(null, children)] : []),
]);
const stateOf = (blocks: PMNode[]) => EditorState.create({ schema,
  doc: schema.nodes.doc.create(null, schema.nodes.blockGroup.create(null, blocks)), plugins: [history(), columnStructurePlugin()],
});
const children = (node: PMNode): PMNode[] => {
  const out: PMNode[] = []; node.lastChild?.forEach((child) => out.push(child)); return out;
};
const ids = (node: PMNode): string[] => {
  const out: string[] = []; node.descendants((n) => { if (n.type.name === "blockContainer" && n.attrs.id) out.push(n.attrs.id); }); return out;
};
const json = (node: PMNode): any => ({
  id: node.attrs.id, type: node.firstChild!.type.name, props: node.firstChild!.attrs,
  content: node.firstChild!.textContent ? [{ type: "text", text: node.firstChild!.textContent, styles: {} }] : undefined,
  children: node.childCount > 1 ? children(node).map(json) : [],
});
const shape = (blocks: any[]): any => blocks.map((b) => ({type: b.type,
  text: typeof b.content === "string" ? b.content : b.content?.map((p: any) => typeof p === "string" ? p : p.text ?? "").join("") ?? "",
  children: shape(b.children ?? []),
}));

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const initial = stateOf([block("a"), block("b"), block("c")]);
  const tx = columnDropTransaction(initial, ["c"], "a", "right")!;
  let state = initial.apply(tx);
  let layout = state.doc.firstChild!.firstChild!;
  check("右拖一次完成移动，两栏不复制源块", layout.firstChild?.type.name === "columnLayout" && ids(state.doc).filter((id) => id === "c").length === 1
    && children(layout).map((s) => s.textContent).join("|") === "a|c" && state.doc.firstChild!.childCount === 2);
  check("移动后光标在源内容", state.selection.$from.parent.textContent === "c");
  check("一次撤销完整还原", undo(state, (tr) => { state = state.apply(tr); }) && state.doc.eq(initial.doc));
  check("一次重做恢复分栏", redo(state, (tr) => { state = state.apply(tr); }) && state.doc.eq(tx.doc));
  const trace: string[] = [];
  const dragEditor = {
    prosemirrorState: initial,
    getSelection: () => undefined,
    getTextCursorPosition: () => ({ block: { id: "c" } }),
    prosemirrorView: { focus: () => trace.push("focus") },
  } as any;
  const cleanup = () => trace.push("blur");
  beginColumnDrag(dragEditor, "c");
  completeColumnDrop(dragEditor);
  // The plugin's dragend capture may finish its target session before React's handler.
  endColumnDrag(dragEditor);
  finishColumnDrag(dragEditor, cleanup);
  finishColumnDrag(dragEditor, cleanup);
  check("成功分栏先清理库的失焦，再恢复焦点，重复dragend不重复清理",
    trace.join(",") === "blur,focus" && !columnDragIds(dragEditor));
  trace.length = 0;
  beginColumnDrag(dragEditor, "c");
  finishColumnDrag(dragEditor, cleanup);
  check("默认排序结束沿用原来的失焦，不抢焦点", trace.join(",") === "blur");
  trace.length = 0;
  const otherEditor = { ...dragEditor, prosemirrorView: { focus: () => trace.push("other-focus") } };
  beginColumnDrag(dragEditor, "c");
  completeColumnDrop(otherEditor as any);
  finishColumnDrag(otherEditor as any, cleanup);
  finishColumnDrag(dragEditor, cleanup);
  check("拖到其它编辑器或外部不把焦点抢回源编辑器", trace.join(",") === "blur");
  trace.length = 0;
  beginColumnDrag(dragEditor, "c");
  completeColumnDrop(dragEditor);
  finishColumnDrag(dragEditor, cleanup, false);
  finishColumnDrag(dragEditor, cleanup);
  check("窗口失焦取消恢复且后来的dragend不会再抢焦点", trace.join(",") === "blur");
  trace.length = 0;
  beginColumnDrag(dragEditor, "c");
  completeColumnDrop(dragEditor);
  beginColumnDrag(dragEditor, "c");
  finishColumnDrag(dragEditor, cleanup);
  check("下一次拖动不继承上一次成功落点", trace.join(",") === "blur");
  const dropPlugin = readFileSync("src/components/editor/blocks/columns/columnDropPlugin.ts", "utf8");
  const handleDrag = readFileSync("src/components/editor/core/useBlockHandleDrag.ts", "utf8");
  check("只有实际提交的分栏落点标记保留焦点，结束入口共用一次性清理",
    dropPlugin.indexOf("view.dispatch(resolved.tr)") < dropPlugin.indexOf("completeColumnDrop(editor)") &&
    handleDrag.includes("finishColumnDrag(editor") && handleDrag.includes('event?.type !== "blur"'));
  check("左侧落点保持顺序", children(initial.apply(columnDropTransaction(initial, ["b", "c"], "a", "left")!).doc.firstChild!.firstChild!)
    .map((s) => s.textContent).join("|") === "bc|a");
  check("标题不能移动或作为分栏目标", !columnDropTransaction(initial, ["a"], "b", "right", "a") && !columnDropTransaction(initial, ["b"], "a", "right", "a"));
  check("自身、缺失块与重复源拒绝", !columnDropTransaction(initial, ["a"], "a", "right") && !columnDropTransaction(initial, ["missing"], "a", "right") && !columnDropTransaction(initial, ["b", "b"], "a", "right"));
  const nested = stateOf([block("parent", "bulletListItem", [block("child")]), block("tail")]);
  check("拒绝把祖先放进子孙", !columnDropTransaction(nested, ["parent"], "child", "right"));
  check("拒绝父子重叠多选", !columnDropTransaction(nested, ["parent", "child"], "tail", "right"));
  const withList = nested.apply(columnDropTransaction(nested, ["parent"], "tail", "right")!);
  check("拖列表保留子列表及 id", ids(withList.doc).includes("child") && withList.doc.textContent === "tailparentchild");
  const existing = stateOf([block("layout", "columnLayout", [
    block("left", "columnSection", [block("a"), block("b")]), block("right", "columnSection", [block("c")]),
  ], {widths: "60,40"}), block("d")]);
  const expanded = existing.apply(columnDropTransaction(existing, ["d"], "right", "right")!);
  layout = expanded.doc.firstChild!.firstChild!;
  check("已有栏边缘加第三栏", children(layout).map((s) => s.textContent).join("|") === "ab|c|d");
  const widths = String(layout.firstChild!.attrs.widths).split(",").map(Number);
  check("加栏保留原栏宽比例", widths.length === 3 && Math.abs(widths[0] / widths[1] - 1.5) < 0.001 && Math.abs(widths.reduce((a,b) => a+b) - 100) < 0.002);
  const split = existing.apply(columnDropTransaction(existing, ["b"], "left", "right")!);
  check("同栏拆出一块，剩余内容不丢", children(split.doc.firstChild!.firstChild!).map((s) => s.textContent).join("|") === "a|b|c");
  check("不能把整栏内容拆成一个空栏", !columnDropTransaction(existing, ["a","b"], "left", "right"));
  const out = existing.apply(columnDropTransaction(existing, ["c"], "d", "right")!);
  check("移空源栏保留可编辑空段", children(out.doc.firstChild!.firstChild!)[1].lastChild?.firstChild?.firstChild?.type.name === "paragraph");
  const rect = {left:100,right:820,top:50,bottom:90,width:720};
  check("右边缘含外侧留白命中", columnDropSide(rect,815,70)==="right" && columnDropSide(rect,840,70)==="right");
  check("中部和纵向越界交还普通排序", columnDropSide(rect,400,70)===null && columnDropSide(rect,815,100)===null);
  check("左侧与窄块边界", columnDropSide(rect,90,70)==="left" && columnDropSide({...rect,width:60},815,70)===null);
  const nestedLayout = existing.apply(columnDropTransaction(existing, ["layout"], "d", "right")!);
  for (const [name, document] of [["新建", tx.doc],["已有栏",expanded.doc],["嵌套列表",withList.doc],["嵌套分栏",nestedLayout.doc]] as const) {
    const content = children(document).map(json);
    const md = jsonContentToMarkdown(content);
    const body = splitGeneratedMarkdown(md).body;
    check(`${name}分栏正文没有私有标签或表格伪装`, !/<!--|<div|columnLayout|columnSection|thinkly:/.test(body));
    check(`${name}分栏保存重开语义一致`, JSON.stringify(shape(markdownToJsonContent(md))) === JSON.stringify(shape(content)), JSON.stringify({ after:shape(markdownToJsonContent(md)),md }));
  }
  const big = stateOf(Array.from({length:2000},(_,i)=>block(`p${i}`)));
  const times: number[] = [];
  for(let i=0;i<30;i++) { const start = performance.now(); columnDropTransaction(big,["p1999"],"p0","right"); times.push(performance.now()-start); }
  times.sort((a,b)=>a-b);
  check("两千块落点事务准备 P95 低于 16 毫秒", times[28] < 16, times[28]);
  return checker.failed;
}
