import { toast } from "@/components/ui/sonner";
import { buildAiFileReferenceAttrs } from "@/components/editor/ai/composer/referenceLookup";
import { buildSelectionQuoteAttrs, SELECTION_QUOTE_DUPLICATE_TOAST } from "@/components/editor/ai/composer/selectionQuote";
import { readWorkspaceDrag } from "@/lib/workspace-drag";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import type { ComposerHandle } from "./types";

/** 共用真实的文件引用与选区 chip，草稿和发送仍走现有 token 流程。 */
export function insertWorkspaceDragIntoAi(
  data: DataTransfer,
  composer: Pick<ComposerHandle, "insertReference" | "appendSelectionQuote" | "focus"> | null,
): boolean {
  const payload = readWorkspaceDrag(data);
  if (!payload || !composer) return false;
  const pages = usePages.getState().pages;
  if (payload.kind === "page") {
    const page = pages[payload.pageId];
    if (!page || page.isFolder || page.trashedAt || page.localPendingCreate) {
      toast.error("该文件暂时无法引用");
      return true;
    }
    // 源列表点击可能留下旧选区，拖入只追加引用，不替换已有提问文字。
    composer.focus();
    composer.insertReference(buildAiFileReferenceAttrs(page, useNotebooks.getState().notebooks));
  } else {
    const source = payload.pageId ? pages[payload.pageId] : null;
    const quote = buildSelectionQuoteAttrs({
      pageId: payload.pageId ?? "external-drag",
      pageTitle: source ? buildAiFileReferenceAttrs(source, useNotebooks.getState().notebooks).titleSnapshot : payload.pageTitle ?? "外部拖入文本",
      text: payload.language ? `\`\`\`${payload.language}\n${payload.text}\n\`\`\`` : payload.text,
    });
    if (!quote) return false;
    const result = composer.appendSelectionQuote(quote, { animate: true, restoreCaret: false });
    if (result === "duplicate") toast(SELECTION_QUOTE_DUPLICATE_TOAST);
  }
  composer.focus();
  return true;
}
