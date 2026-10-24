import type { BlockNoteEditor } from "@blocknote/core";
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  ChevronRight, Quote, Info, Minus, Table, Code, Sigma, GitGraph, Image,
  Video, Music, FileText, Columns2,
} from "@/components/ui/icons";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { canConvertBlock } from "./blockConversionPolicy";

export const BLOCK_HANDLE_ICONS = {
  paragraph: Type, heading: Heading1, bulletListItem: List,
  numberedListItem: ListOrdered, checkListItem: CheckSquare,
  toggleListItem: ChevronRight, quote: Quote, callout: Info, divider: Minus,
  table: Table, codeBlock: Code, image: Image, video: Video, audio: Music,
  file: FileText, columnLayout: Columns2, columnSection: Columns2,
};

export function BlockHandleIcon({ block }: { block: any }) {
  let Icon = BLOCK_HANDLE_ICONS[block.type as keyof typeof BLOCK_HANDLE_ICONS] ?? Type;
  if (block.type === "heading") Icon = [Heading1, Heading2, Heading3][Number(block.props.level) - 1] ?? Heading1;
  if (block.type === "codeBlock" && block.props.language === "math") Icon = Sigma;
  if (block.type === "codeBlock" && block.props.language === "mermaid") Icon = GitGraph;
  return <Icon aria-hidden="true" />;
}

export function isEmptyHandleParagraph(block: any): boolean {
  return block?.type === "paragraph" && Array.isArray(block.content) &&
    block.content.every((part: any) => part.type === "text" && !part.text) &&
    !block.children?.length;
}

export function blockHandleCapabilities(editor: BlockNoteEditor<any, any, any>, block: any) {
  const title = block?.id === getProtectedTitleBlockId(editor);
  const section = block?.type === "columnSection";
  const editable = Boolean(editor.isEditable && block);
  const props = block ? editor.schema.blockSchema[block.type]?.propSchema : undefined;
  const inline = editable && !title && editor.schema.blockSchema[block.type]?.content === "inline";
  return {
    color: Boolean(inline && props?.textColor && props?.backgroundColor),
    align: Boolean(inline && props?.textAlignment),
    copy: Boolean(block),
    mutate: editable && !title && !section,
    insertBefore: editable && !title && !section,
    insertAfter: editable && !section,
    convert: canConvertBlock(editor, block),
    draggable: editable && !title && !section,
  };
}
