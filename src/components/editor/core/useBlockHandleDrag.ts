import { useCallback, useEffect, type RefObject, type Dispatch, type SetStateAction } from "react";
import { ensureBlockMoveDragging } from "./ensureBlockMoveDragging";
import { startHeavyBlockDrag } from "./lightweightBlockDrag";
import { beginBlockHandleDrag, endBlockHandleDrag, markBlockHandleDrag } from "@/lib/editor-split/blockHandleDrag";
import { beginColumnDrag, finishColumnDrag } from "../blocks/columns/columnDragSession";

export function useBlockHandleDrag(editor: any, sideMenu: any, block: any, pressedHandle: RefObject<boolean>, closeMenu: () => void, isDragging: boolean, setIsDragging: Dispatch<SetStateAction<boolean>>) {
  const handleDragStart = useCallback((event: React.DragEvent) => {
    if (!block || !sideMenu) return;
    beginBlockHandleDrag();
    beginColumnDrag(editor, block.id);
    closeMenu();
    setIsDragging(true);
    if (event.dataTransfer && startHeavyBlockDrag(editor.prosemirrorView, event.dataTransfer, block.id)) return;
    sideMenu.blockDragStart({ dataTransfer: event.dataTransfer, clientY: event.clientY }, block);
    if (event.dataTransfer) markBlockHandleDrag(event.dataTransfer);
    ensureBlockMoveDragging(editor.prosemirrorView, event.dataTransfer);
  }, [block, editor, sideMenu, closeMenu]);
  const handleDragEnd = useCallback((event?: { type: string }) => {
    finishColumnDrag(editor, () => {
      endBlockHandleDrag();
      pressedHandle.current = false;
      setIsDragging(false);
      sideMenu?.blockDragEnd?.();
    }, event?.type !== "blur");
  }, [editor, sideMenu, pressedHandle]);
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
