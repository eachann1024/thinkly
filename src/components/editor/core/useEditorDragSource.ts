import { useEffect, type RefObject } from "react";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { GOOSE_TEXT_MIME, writeTextDrag } from "@/lib/workspace-drag";
import type { Page } from "@/types";

type EditorDragApi = {
  getSelectedText: () => string;
  getBlock: (id: string) => { type: string; props?: { language?: unknown } } | undefined;
};

/** 在 ProseMirror 完成原生序列化后补来源，保留正文内拖动的既有移动语义。 */
export function useEditorDragSource(
  editor: EditorDragApi,
  page: Page,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onDragStart = (event: DragEvent) => {
      const data = event.dataTransfer;
      const target = event.target instanceof Element ? event.target : null;
      if (!data || !target?.closest(".bn-editor") || target.closest("img,video,audio")) return;
      if (Array.from(data.types).includes(GOOSE_TEXT_MIME)) return;
      const text = data.getData("text/plain") || editor.getSelectedText?.() || "";
      if (!text.trim()) return;
      const blockId = target.closest<HTMLElement>('[data-node-type="blockContainer"]')?.dataset.id;
      const block = blockId ? editor.getBlock(blockId) : null;
      writeTextDrag(data, {
        kind: "text", text, pageId: page.id, pageTitle: getPageTitle(page),
        language: block?.type === "codeBlock"
          ? typeof block.props?.language === "string" && block.props.language || "text"
          : undefined,
      });
    };
    container.addEventListener("dragstart", onDragStart);
    return () => container.removeEventListener("dragstart", onDragStart);
  }, [containerRef, editor, page]);
}
