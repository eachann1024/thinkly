import { startPointerDrag } from "@/lib/interaction/pointerDrag";
import { i18nYaml, createTranslator, subscribeLanguage } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/columns/columnResize.ts#messages:1">`
zh-Hans:
  resizeColumns: "调整第 {{first}}、{{second}} 栏宽度"
en:
  resizeColumns: "Resize columns {{first}} and {{second}}"
ja:
  resizeColumns: "第 {{first}}・{{second}} 列の幅を調整"
`;
const t = createTranslator(messages);
import type { BlockNoteEditor } from "@blocknote/core";
import { columnWidthsProp, readColumnWidths } from "./columnModel";

const GAP = 28;

export function renderColumnResize(block: any, editor: BlockNoteEditor<any, any, any>) {
  const dom = document.createElement("div");
  dom.className = "goose-columns-chrome";
  dom.contentEditable = "false";
  dom.dataset.columnResizeScope = crypto.randomUUID();
  const layoutStyle = document.createElement("style");
  const ownerSelector = `.bn-block:has(> .bn-block-content > .goose-columns-chrome[data-column-resize-scope="${dom.dataset.columnResizeScope}"])`;
  dom.appendChild(layoutStyle);
  const count = Math.max(2, block.children?.length ?? 2);
  let widths = readColumnWidths(block.props.widths, count);
  let owner: HTMLElement | null = null;
  let disposed = false;
  let frozenWidth: number | null = null;
  let cancelDrag: (() => void) | undefined;
  let layoutRule: CSSStyleRule | null = null;
  let paintedTracks = "";
  const handles: HTMLButtonElement[] = [];
  const paint = () => {
    if (disposed || !owner || !dom.isConnected) return;
    const width = frozenWidth ?? owner.clientWidth;
    // 仅修改本 NodeView 的 chrome。外层 blockContainer 属于 PM，写它的
    // style/data-* 会被 DOMObserver 当作内容修改并不断重建 NodeView。
    if (!layoutRule && layoutStyle.sheet) {
      layoutStyle.sheet.insertRule(`${ownerSelector} > .bn-block-group {}`, 0);
      layoutRule = layoutStyle.sheet.cssRules[0] as CSSStyleRule;
    }
    const tracks = widths.map((part) => `minmax(0, ${part}fr)`).join(" ");
    if (layoutRule && paintedTracks !== tracks) {
      layoutRule.style.gridTemplateColumns = tracks;
      paintedTracks = tracks;
    }
    const stacked = String(width < 520);
    if (dom.dataset.columnsStacked !== stacked) dom.dataset.columnsStacked = stacked;
    let sum = 0;
    handles.forEach((handle, index) => {
      sum += widths[index];
      const left = `${Math.max(0, width - GAP * (count - 1)) * sum / 100 + GAP * (index + 0.5)}px`;
      if (handle.style.left !== left) handle.style.left = left;
      const value = String(Math.round(widths[index]));
      if (handle.getAttribute("aria-valuenow") !== value) handle.setAttribute("aria-valuenow", value);
      if (handle.disabled === editor.isEditable) handle.disabled = !editor.isEditable;
    });
  };
  const commit = () => {
    const current = editor.getBlock(block.id);
    if (current?.type === "columnLayout" && editor.isEditable) {
      editor.updateBlock(current, { props: { widths: columnWidthsProp(widths) } });
    }
  };
  const resizePair = (index: number, next: number, base = widths) => {
    const total = base[index] + base[index + 1];
    const minimum = Math.min(12, total / 3);
    const left = Math.max(minimum, Math.min(total - minimum, next));
    widths = [...base];
    widths[index] = left;
    widths[index + 1] = total - left;
    paint();
  };
  for (let index = 0; index < count - 1; index += 1) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "goose-column-resizer";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-label", t("resizeColumns", { first: index + 1, second: index + 2 }));
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-valuemin", "1");
    handle.setAttribute("aria-valuemax", "99");
    handle.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key) || !editor.isEditable) return;
      event.preventDefault();
      event.stopPropagation();
      resizePair(index, widths[index] + (event.key === "ArrowLeft" ? -2 : 2));
      commit();
    });
    handle.addEventListener("pointerdown", (event) => {
      if (!editor.isEditable || event.button !== 0 || !event.isPrimary || !owner) return;
      event.preventDefault();
      event.stopPropagation();
      cancelDrag?.();
      const startX = event.clientX;
      const base = [...widths];
      frozenWidth = owner.clientWidth;
      // CSS zoom affects pointer coordinates but not grid tracks or handle offsets.
      const scale = owner.getBoundingClientRect().width / Math.max(1, owner.offsetWidth);
      const available = Math.max(1, frozenWidth - GAP * (count - 1)) * scale;
      dom.dataset.columnsResizing = "true";
      const finish = (save: boolean) => {
        frozenWidth = null;
        delete dom.dataset.columnsResizing;
        cancelDrag = undefined;
        if (save) commit();
        else { widths = base; paint(); }
      };
      const gesture = startPointerDrag({
        target: handle,
        pointerId: event.pointerId,
        startX,
        cursor: "col-resize",
        onMove: (x) => resizePair(index, base[index] + (x - startX) / available * 100, base),
        onEnd: () => finish(true),
        onCancel: () => finish(false),
      });
      cancelDrag = gesture.cancel;
    });
    handles.push(handle);
    dom.appendChild(handle);
  }
  const unsubscribeLanguage = subscribeLanguage(() => {
    handles.forEach((handle, index) => handle.setAttribute(
      "aria-label", t("resizeColumns", { first: index + 1, second: index + 2 }),
    ));
  });
  const observer = new ResizeObserver(paint);
  const attach = () => {
    if (disposed || !dom.isConnected) return false;
    owner = dom.closest<HTMLElement>('[data-node-type="blockContainer"]');
    if (!owner) return false;
    connection.disconnect();
    observer.observe(owner);
    paint();
    return true;
  };
  // BlockNote 可在离线 DOM 中构造 NodeView；首个帧不保证已插入文档。
  const connection = new MutationObserver((records) => {
    // 只关注包含本 NodeView 的插入，接入后立即销毁连接观察器。
    if (records.some((record) => Array.from(record.addedNodes).some((node) => node.contains(dom)))) attach();
  });
  if (!attach()) connection.observe(document, { childList: true, subtree: true });
  return {
    dom,
    destroy() {
      disposed = true;
      unsubscribeLanguage();
      cancelDrag?.();
      connection.disconnect();
      observer.disconnect();
    },
  };
}
