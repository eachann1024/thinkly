import { getColspan, getRowspan } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { useExtension, useExtensionState } from "@blocknote/react";
import { useEffect, useRef, useState, type DragEvent } from "react";

/** Keep reordering in BlockNote's transaction, selection and undo pipeline. */
export function useTableHandleDrag(
  orientation: "row" | "column",
  hideOtherElements: (hide: boolean) => void,
) {
  const handles = useExtension(TableHandlesExtension);
  const state = useExtensionState(TableHandlesExtension);
  const active = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const index = orientation === "row" ? state?.rowIndex : state?.colIndex;
  const draggable = Boolean(
    handles && state && index !== undefined &&
      (orientation === "row"
        ? handles.getCellsAtRowHandle(state.block, index)
            .every(({ cell }) => getRowspan(cell) === 1)
        : handles.getCellsAtColumnHandle(state.block, index)
            .every(({ cell }) => getColspan(cell) === 1)),
  );

  useEffect(() => () => {
    if (!active.current) return;
    handles?.dragEnd();
    hideOtherElements(false);
  }, [handles, hideOtherElements]);

  return {
    draggable,
    isDragging,
    onDragStart(event: DragEvent<HTMLButtonElement>) {
      if (!draggable || !handles) {
        event.preventDefault();
        return;
      }
      active.current = true;
      setIsDragging(true);
      hideOtherElements(true);
      if (orientation === "row") handles.rowDragStart(event);
      else handles.colDragStart(event);
    },
    onDragEnd() {
      if (!active.current) return;
      active.current = false;
      handles?.dragEnd();
      hideOtherElements(false);
      setIsDragging(false);
    },
  };
}
