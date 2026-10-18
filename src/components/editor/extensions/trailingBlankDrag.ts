import type { EditorView } from "@tiptap/pm/view";
import { tableEditingKey } from "prosemirror-tables";
import { TRAILING_BLANK_CLICK_SLOP_PX } from "./trailingBlankClickGeometry";
import { docPosAtClient } from "./tableCellSelectionDom";
import { selectionBetweenPointer, textSelectionAt } from "./tableCellSelectionModel";

const DRAG_THRESHOLD_PX = 4;

type DragFlagEvent = MouseEvent & { gooseBlankDragArmed?: boolean };

/**
 * 点在文字行带之下。行尾右侧仍走浏览器拖选，这里不接管。
 */
export function isClickBelowTextPosition(
  view: EditorView,
  clientY: number,
  pos: number,
): boolean {
  try {
    return clientY > view.coordsAtPos(pos).bottom + TRAILING_BLANK_CLICK_SLOP_PX;
  } catch {
    return false;
  }
}

function placeCollapsedCaret(view: EditorView, pos: number): number {
  const doc = view.state.doc;
  const clamped = Math.max(0, Math.min(pos, doc.content.size));
  const sel = textSelectionAt(doc, clamped, clamped);
  if (sel && !view.state.selection.eq(sel)) {
    view.dispatch(view.state.tr.setSelection(sel).setMeta("pointer", true));
  }
  return view.state.selection.head;
}

let stopDrag: (() => void) | null = null;
const blankDragViews = new WeakSet<EditorView>();

export function isBlankDragActive(view: EditorView): boolean {
  return blankDragViews.has(view);
}

function extendDrag(view: EditorView, anchor: number, event: MouseEvent) {
  if (view.isDestroyed || !view.dom.isConnected) return;
  const head = docPosAtClient(view, event.clientX, event.clientY);
  if (head == null) return;
  const next = selectionBetweenPointer(view.state.doc, anchor, head);
  if (!next || view.state.selection.eq(next)) return;
  const tr = view.state.tr.setSelection(next).setMeta("pointer", true);
  tr.setMeta(tableEditingKey, -1);
  view.dispatch(tr);
}

/** 从锚点跟鼠标扩展选区。同一按下只挂一次。 */
export function armBottomBlankSelectionDrag(
  view: EditorView,
  event: MouseEvent,
  anchor: number,
): void {
  const flagged = event as DragFlagEvent;
  if (flagged.gooseBlankDragArmed) return;
  flagged.gooseBlankDragArmed = true;

  stopDrag?.();
  blankDragViews.add(view);
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  const root = view.dom.ownerDocument;

  const onMove = (move: MouseEvent) => {
    if (view.isDestroyed) {
      stop();
      return;
    }
    if (move.buttons === 0) {
      stop();
      return;
    }
    if (!moved) {
      if (
        Math.abs(move.clientX - startX) <= DRAG_THRESHOLD_PX &&
        Math.abs(move.clientY - startY) <= DRAG_THRESHOLD_PX
      ) {
        return;
      }
      moved = true;
    }
    move.preventDefault();
    extendDrag(view, anchor, move);
  };

  const stop = () => {
    blankDragViews.delete(view);
    root.removeEventListener("mousemove", onMove);
    root.removeEventListener("mouseup", onUp);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("blur", onUp);
    if (stopDrag === stop) stopDrag = null;
  };
  const onUp = () => stop();

  stopDrag = stop;
  root.addEventListener("mousemove", onMove);
  root.addEventListener("mouseup", onUp);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("blur", onUp);
}

/** 块内底部空白：自己放下光标并开始拖选。 */
export function startBlankDragFromPos(
  view: EditorView,
  event: MouseEvent,
  pos: number,
): void {
  if (!view.hasFocus()) view.focus();
  const anchor = placeCollapsedCaret(view, pos);
  armBottomBlankSelectionDrag(view, event, anchor);
  event.preventDefault();
}
