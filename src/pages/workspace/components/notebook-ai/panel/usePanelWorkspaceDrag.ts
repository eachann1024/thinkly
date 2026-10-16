import { useEffect, useState, type DragEvent, type RefObject } from "react";
import { GOOSE_FOLDER_MIME, hasWorkspaceDrag } from "@/lib/workspace-drag";
import type { ComposerHandle } from "../composer/types";
import { insertWorkspaceDragIntoAi } from "../composer/workspaceDragToAi";

/** 对话正文也可接收来源拖拽；落点始终追加到当前会话输入框。 */
export function usePanelWorkspaceDrag(
  panelRootRef: RefObject<HTMLDivElement | null>,
  composerRef: RefObject<ComposerHandle | null>,
  disabled: boolean,
) {
  const [dropActive, setDropActive] = useState(false);
  useEffect(() => {
    const clear = () => setDropActive(false);
    document.addEventListener("drop", clear, true);
    document.addEventListener("dragend", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("drop", clear, true);
      document.removeEventListener("dragend", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, []);
  useEffect(() => {
    const onDrop = (event: globalThis.DragEvent) => {
      const panel = panelRootRef.current;
      const data = event.dataTransfer;
      if (!panel || !(event.target instanceof Node) || !panel.contains(event.target) || !data) return;
      const folder = Array.from(data.types).includes(GOOSE_FOLDER_MIME);
      if (!folder && !hasWorkspaceDrag(data)) return;
      // BlockNote's document capture can delete the source before React sees a
      // drop. Own workspace drops here; image attachments keep their dock path.
      event.preventDefault();
      event.stopPropagation();
      setDropActive(false);
      if (folder || disabled || !composerRef.current) {
        data.dropEffect = "none";
        return;
      }
      data.dropEffect = "copy";
      insertWorkspaceDragIntoAi(data, composerRef.current);
    };
    window.addEventListener("drop", onDrop, true);
    return () => window.removeEventListener("drop", onDrop, true);
  }, [composerRef, disabled, panelRootRef]);
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.types).includes(GOOSE_FOLDER_MIME)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "none";
      setDropActive(false);
      return;
    }
    if (disabled || !composerRef.current || !hasWorkspaceDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDropActive(false);
  };
  return { dropActive, onDragOver, onDragLeave };
}
