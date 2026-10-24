import type { BlockNoteEditor } from "@blocknote/core";
import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import { getProtectedTitleBlockId } from "../../utils/documentTitlePolicy";
import { columnDragIds, completeColumnDrop, endColumnDrag } from "./columnDragSession";
import { columnDropTarget } from "./columnDropTarget";
import { columnDropTransaction } from "./columnDropTransaction";

export function columnDropPlugin(editor: BlockNoteEditor<any, any, any>) {
  return new Plugin({
    key: new PluginKey("goose-column-drop"),
    view(view) {
      const document = view.dom.ownerDocument;
      const window = document.defaultView!;
      const indicator = document.createElement("div");
      indicator.className = "goose-column-drop-indicator";
      indicator.setAttribute("aria-hidden", "true");
      let frame = 0;
      let pointer: { x: number; y: number } | undefined;
      let cache: { doc: typeof view.state.doc; key: string; tr: Transaction | null } | undefined;
      const hide = () => {
        indicator.remove();
        delete view.dom.dataset.columnDrop;
      };
      const clear = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        pointer = undefined;
        cache = undefined;
        hide();
      };
      const resolve = (x: number, y: number) => {
        const ids = columnDragIds(editor);
        if (!ids || !editor.isEditable || view.composing) return null;
        const target = columnDropTarget(view.dom, x, y);
        if (!target) return null;
        const key = `${ids.join("\0")}:${target.id}:${target.side}`;
        if (cache?.doc !== view.state.doc || cache.key !== key) {
          cache = { doc: view.state.doc, key, tr: columnDropTransaction(view.state, ids, target.id, target.side, getProtectedTitleBlockId(editor)) };
        }
        return cache.tr ? { target, tr: cache.tr } : null;
      };
      const paint = () => {
        frame = 0;
        const drop = pointer && resolve(pointer.x, pointer.y);
        if (!drop) { hide(); return; }
        const { rect, side } = drop.target;
        // A single compositor layer; pointer events never change the editor document.
        indicator.style.transform = `translate3d(${(side === "right" ? rect.right : rect.left) - 1.5}px,${rect.top}px,0) scaleY(${Math.max(1, rect.height)})`;
        if (!indicator.isConnected) document.body.appendChild(indicator);
        view.dom.dataset.columnDrop = "true";
      };
      const over = (event: DragEvent) => {
        if (!columnDragIds(editor)) return;
        const drop = !event.altKey && resolve(event.clientX, event.clientY);
        if (!drop) { clear(); return; }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        pointer = { x: event.clientX, y: event.clientY };
        // Show the first valid target immediately even when the host throttles rAF.
        if (!indicator.isConnected) paint();
        else if (!frame) frame = window.requestAnimationFrame(paint);
      };
      const drop = (event: DragEvent) => {
        const resolved = !event.altKey && resolve(event.clientX, event.clientY);
        clear();
        if (!resolved) return;
        event.preventDefault();
        event.stopPropagation();
        view.dragging = null;
        view.dispatch(resolved.tr);
        completeColumnDrop(editor);
        view.focus();
      };
      const finish = () => { clear(); endColumnDrag(editor); };
      const leave = (event: DragEvent) => { if (!event.relatedTarget) clear(); };
      const key = (event: KeyboardEvent) => { if (event.key === "Escape") finish(); };
      const scroll = () => { if (pointer && !frame) frame = window.requestAnimationFrame(paint); };
      document.addEventListener("dragover", over, true);
      document.addEventListener("drop", drop, true);
      document.addEventListener("dragend", finish, true);
      document.addEventListener("dragleave", leave, true);
      document.addEventListener("keydown", key, true);
      document.addEventListener("scroll", scroll, true);
      window.addEventListener("blur", finish);
      return {
        update() { if (cache?.doc !== view.state.doc) clear(); },
        destroy() {
          finish();
          document.removeEventListener("dragover", over, true);
          document.removeEventListener("drop", drop, true);
          document.removeEventListener("dragend", finish, true);
          document.removeEventListener("dragleave", leave, true);
          document.removeEventListener("keydown", key, true);
          document.removeEventListener("scroll", scroll, true);
          window.removeEventListener("blur", finish);
        },
      };
    },
  });
}
