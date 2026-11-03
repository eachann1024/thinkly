import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { useImageExportView } from "@/stores/useImageExportView";

export function openImageExport(pageId: string, blocks: BlockNoteContent) {
  try {
    flushEditorContent(true);
  } catch {
  }
  const scope = blocks.length > 0 ? "selection" : "page";
  useImageExportView.getState().enter(pageId, scope, blocks);
}
