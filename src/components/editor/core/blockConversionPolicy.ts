import type { BlockNoteEditor } from "@blocknote/core";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";

// Inline content alone does not make a block safe to convert (code and diagrams
// also use it). Only ordinary rich-text blocks share conversion semantics.
const CONVERTIBLE_TEXT_BLOCKS = new Set([
  "paragraph", "heading", "bulletListItem", "numberedListItem",
  "checkListItem", "toggleListItem", "quote", "callout",
]);

export function canConvertBlock(editor: BlockNoteEditor<any, any, any>, block: { id: string; type: string } | undefined | null): boolean {
  return Boolean(editor.isEditable && block && CONVERTIBLE_TEXT_BLOCKS.has(block.type) &&
    block.id !== getProtectedTitleBlockId(editor) &&
    editor.schema.blockSchema[block.type]?.content === "inline");
}
