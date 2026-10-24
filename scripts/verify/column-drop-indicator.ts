import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { columnDropPlugin } from "@/components/editor/blocks/columns/columnDropPlugin";
import { beginColumnDrag, endColumnDrag } from "@/components/editor/blocks/columns/columnDragSession";
import { createChecker } from "./lib/check";

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const schema = new Schema({ nodes: {
    doc: { content: "blockGroup" }, blockGroup: { content: "blockContainer+" },
    blockContainer: { content: "blockContent blockGroup?", attrs: { id: { default: null } } },
    paragraph: { group: "blockContent", content: "text*" },
    columnLayout: { group: "blockContent", attrs: { widths: { default: "50,50" } } },
    columnSection: { group: "blockContent" }, text: { group: "inline" },
  } });
  const block = (id: string) => schema.nodes.blockContainer.create({ id }, schema.nodes.paragraph.create(null, schema.text(id)));
  let state = EditorState.create({ schema, doc: schema.nodes.doc.create(null, schema.nodes.blockGroup.create(null, [block("a"), block("b")])) });
  const original = state.doc;
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0, canceled = 0, focusCount = 0;
  const window = Object.assign(new EventTarget(), {
    requestAnimationFrame(callback: FrameRequestCallback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id: number) { if (frames.delete(id)) canceled++; },
  });
  const indicator = { isConnected: false, className: "", style: { transform: "" },
    setAttribute() {}, remove() { this.isConnected = false; } };
  let top = 50;
  const target = { dataset: { id: "a" }, parentElement: null,
    getBoundingClientRect: () => ({ left: 100, right: 820, top, bottom: top + 40, width: 720, height: 40 }),
    querySelector: () => ({ dataset: { contentType: "paragraph" } }),
  };
  const hit = { closest: () => target };
  const document = Object.assign(new EventTarget(), {
    defaultView: window, createElement: () => indicator,
    body: { appendChild(node: typeof indicator) { node.isConnected = true; } },
    elementFromPoint: () => hit,
  });
  const dom = { ownerDocument: document, dataset: {} as Record<string, string>,
    getBoundingClientRect: () => ({ left: 100, right: 820, top: 0, bottom: 600 }),
    contains: (node: unknown) => node === hit || node === target,
  };
  const view = { dom, get state() { return state; }, composing: false, dragging: {},
    dispatch(tr: any) { state = state.apply(tr); }, focus() { focusCount++; },
  };
  const editor = { prosemirrorView: view, get prosemirrorState() { return state; }, isEditable: true,
    getSelection: () => undefined, getTextCursorPosition: () => ({ block: { id: "b" } }),
  };
  const pluginView = columnDropPlugin(editor as any).spec.view!(view as any);
  const send = (type: string, x = 815, options = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { clientX: x, clientY: top + 15, altKey: false, dataTransfer: { dropEffect: "none" }, ...options });
    document.dispatchEvent(event);
    return event;
  };
  const flush = () => {
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(callback => callback(0));
  };
  try {
    beginColumnDrag(editor as any, "b");
    const first = send("dragover");
    check("首个有效列落点同步挂载指示器，不等待任何rAF", first.defaultPrevented && indicator.isConnected && frames.size === 0
      && indicator.style.transform === "translate3d(818.5px,50px,0) scaleY(40)" && dom.dataset.columnDrop === "true");
    check("落点提示仅更新浮层，拖过不修改正文与持久化", state.doc === original);
    top = 70;
    send("dragover"); send("dragover"); send("dragover");
    check("后续有效移动仍合并为单个rAF，不逐事件修改样式", frames.size === 1 && indicator.style.transform.includes(",50px,"));
    flush();
    check("后续rAF读取最新落点几何", indicator.style.transform.includes(",70px,") && frames.size === 0);
    send("dragover");
    const before = canceled;
    send("dragover", 400);
    check("离开有效边缘立即隐藏并取消排队帧", !indicator.isConnected && frames.size === 0 && canceled > before && !dom.dataset.columnDrop);
    send("dragover");
    check("重新进入有效边缘仍同步出现", indicator.isConnected && frames.size === 0);
    send("dragover", 815, { altKey: true });
    check("Alt退回普通排序立即清理，不残留指示器", !indicator.isConnected && !dom.dataset.columnDrop);
    send("dragover"); send("dragover"); send("dragend");
    check("原生拖动结束立即清理浮层和待执行rAF", !indicator.isConnected && frames.size === 0 && !dom.dataset.columnDrop);
    beginColumnDrag(editor as any, "b");
    editor.isEditable = false;
    send("dragover");
    check("只读编辑器拒绝显示列落点", !indicator.isConnected && frames.size === 0);
    editor.isEditable = true;
    send("dragover");
    window.dispatchEvent(new Event("blur"));
    check("窗口失焦同步移除首个落点提示", !indicator.isConnected && !dom.dataset.columnDrop);
    beginColumnDrag(editor as any, "b");
    send("dragover");
    const drop = send("drop");
    check("同步提示保留实际分栏提交与焦点恢复", drop.defaultPrevented && state.doc.firstChild?.firstChild?.firstChild?.type.name === "columnLayout"
      && focusCount === 1 && !indicator.isConnected && frames.size === 0);
  } finally {
    pluginView.destroy?.();
    endColumnDrag(editor as any);
  }
  return checker.failed;
}
