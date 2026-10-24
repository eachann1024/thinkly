import { useEffect, type DragEvent, type RefObject } from "react";
import { GOOSE_FOLDER_MIME, hasWorkspaceDrag } from "@/lib/workspace-drag";

export function usePanelWorkspaceDrag(
  panelRootRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const onDrop = (event: globalThis.DragEvent) => {
      const panel = panelRootRef.current;
      const data = event.dataTransfer;
      if (!panel || !(event.target instanceof Node) || !panel.contains(event.target) || !data) return;
      const folder = Array.from(data.types).includes(GOOSE_FOLDER_MIME);
      if (!folder && !hasWorkspaceDrag(data)) return;
      event.preventDefault();
      event.stopPropagation();
      data.dropEffect = "none";
    };
    window.addEventListener("drop", onDrop, true);
    return () => window.removeEventListener("drop", onDrop, true);
  }, [panelRootRef]);
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const folder = Array.from(event.dataTransfer.types).includes(GOOSE_FOLDER_MIME);
    if (!folder && !hasWorkspaceDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "none";
  };
  return { onDragOver };
}
