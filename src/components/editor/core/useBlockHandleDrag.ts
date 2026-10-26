import { useCallback, useEffect, useRef, type RefObject, type Dispatch, type SetStateAction } from "react";
import { ensureBlockMoveDragging } from "./ensureBlockMoveDragging";
import { startHeavyBlockDrag } from "./lightweightBlockDrag";
import { preserveImageDragPreviewWidths } from "./imageDragPreview";
import { preserveImageDragWidths } from "./imageDragWidths";
import { beginBlockHandleDrag, endBlockHandleDrag, markBlockHandleDrag } from "@/lib/editor-split/blockHandleDrag";

export function useBlockHandleDrag(editor: any, sideMenu: any, block: any, pressedHandle: RefObject<boolean>, closeMenu: () => void, isDragging: boolean, setIsDragging: Dispatch<SetStateAction<boolean>>) {
  const activeDrag = useRef(false);
  const handleDragStart = useCallback((event: React.DragEvent) => {
    if (!block || !sideMenu) return;
    activeDrag.current = true;
    beginBlockHandleDrag();
    closeMenu();
    setIsDragging(true);
    if (event.dataTransfer && startHeavyBlockDrag(editor.prosemirrorView, event.dataTransfer, block.id)) return;
    sideMenu.blockDragStart({ dataTransfer: event.dataTransfer, clientY: event.clientY }, block);
    const view = editor.prosemirrorView;
    const preview = view.dom.ownerDocument.querySelector(".bn-drag-preview");
    if (event.dataTransfer && preview && preserveImageDragPreviewWidths(view.dom, preview)) {
      event.dataTransfer.setDragImage(preview, 0, 0);
    }
    if (event.dataTransfer) markBlockHandleDrag(event.dataTransfer);
    ensureBlockMoveDragging(editor.prosemirrorView, event.dataTransfer);
    if (view.dragging) {
      const slice = preserveImageDragWidths(view.dom, view.dragging.slice);
      if (slice !== view.dragging.slice) {
        view.dragging = { ...view.dragging, slice };
        event.dataTransfer?.setData("blocknote/html", view.serializeForClipboard(slice).dom.innerHTML);
      }
    }
  }, [block, editor, sideMenu, closeMenu]);
  const handleDragEnd = useCallback(() => {
    if (!activeDrag.current) return;
    activeDrag.current = false;
    endBlockHandleDrag();
    pressedHandle.current = false;
    setIsDragging(false);
    sideMenu?.blockDragEnd?.();
  }, [sideMenu, pressedHandle]);
  useEffect(() => {
    if (!isDragging) return;
    const onDrop = () => window.setTimeout(handleDragEnd, 0);
    document.addEventListener("drop", onDrop, true);
    window.addEventListener("blur", handleDragEnd);
    return () => {
      document.removeEventListener("drop", onDrop, true);
      window.removeEventListener("blur", handleDragEnd);
    };
  }, [isDragging, handleDragEnd]);
  return { isDragging, handleDragStart, handleDragEnd };
}
