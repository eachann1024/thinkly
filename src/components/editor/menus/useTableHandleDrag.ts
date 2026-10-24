import { TableHandlesExtension } from "@blocknote/core/extensions";
import { useBlockNoteEditor, useExtension, useExtensionState } from "@blocknote/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { tableReorderPreview } from "./tableReorderPreview";

export function useTableHandleDrag(
  orientation: "row" | "column",
  hideOtherElements: (hide: boolean) => void,
  index: number | undefined,
  toggleMenu: () => void,
) {
  const editor = useBlockNoteEditor<any, any, any>();
  const handles = useExtension(TableHandlesExtension);
  const state = useExtensionState(TableHandlesExtension);
  const cancel = useRef<(() => void) | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => () => cancel.current?.(), []);

  return {
    draggable: false,
    isDragging,
    onClickCapture(event: MouseEvent<HTMLButtonElement>) {
      if (event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    },
    onPointerDownCapture(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || !handles || !state || index === undefined) return;
      cancel.current?.();
      const grip = event.currentTarget;
      const view = editor.prosemirrorView;
      const preview = tableReorderPreview(view, state.block.id, orientation, index, grip);
      const win = grip.ownerDocument.defaultView;
      if (!win) return;
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId;
      const origin = orientation === "row" ? event.clientY : event.clientX;
      const coordinate = (e: globalThis.PointerEvent) => orientation === "row" ? e.clientY : e.clientX;
      let dragging = false;
      let done = false;
      const abort = new AbortController();
      const options = { capture: true, signal: abort.signal };
      handles.freezeHandles();
      hideOtherElements(true);
      grip.setPointerCapture(pointerId);
      const finish = (commit: boolean, tap = false) => {
        if (done) return;
        done = true;
        abort.abort();
        observer.disconnect();
        cancel.current = undefined;
        if (grip.hasPointerCapture(pointerId)) grip.releasePointerCapture(pointerId);
        preview?.finish(commit && dragging);
        handles.unfreezeHandles();
        hideOtherElements(false);
        setIsDragging(false);
        if (tap) toggleMenu();
      };
      cancel.current = () => finish(false);
      const observer = new MutationObserver(() => {
        if (!grip.isConnected || (preview && !preview.valid())) finish(false);
      });
      observer.observe(grip.ownerDocument, { childList: true, subtree: true });
      win.addEventListener("pointermove", (move) => {
        if (move.pointerId !== pointerId) return;
        if (preview && !preview.valid()) return finish(false);
        if (!(move.buttons & 1)) return finish(true);
        const delta = coordinate(move) - origin;
        if (!dragging && Math.abs(delta) < 4) return;
        if (!preview) return;
        if (!dragging) { dragging = true; setIsDragging(true); }
        preview.paint(delta);
        move.preventDefault();
        move.stopPropagation();
      }, options);
      win.addEventListener("pointerup", (up) => {
        if (up.pointerId !== pointerId) return;
        if (dragging) preview?.paint(coordinate(up) - origin);
        finish(true, !dragging);
        up.preventDefault();
        up.stopPropagation();
      }, options);
      win.addEventListener("pointercancel", (e) => {
        if (e.pointerId === pointerId) finish(false);
      }, options);
      grip.addEventListener("lostpointercapture", () => finish(false), { signal: abort.signal });
      win.addEventListener("blur", () => finish(false), options);
      win.addEventListener("scroll", () => finish(false), options);
      win.addEventListener("resize", () => finish(false), options);
      win.addEventListener("keydown", (key) => {
        if (key.key !== "Escape") return;
        key.preventDefault();
        key.stopPropagation();
        finish(false);
      }, options);
    },
  };
}
