import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { isBlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { LOCAL_PRESERVE_EMPTY_PARAGRAPH } from "./localBlockPropsWrappers";
import { attachNoteMeta, createNoteSink, MarkdownScope } from "./noteMeta";
import { serializeColumns } from "./serialize/columns";
import { joinBlocks, type MarkdownPart } from "./serialize/joinBlocks";
import { CHILDREN_CONSUMED_TYPES, LIST_ITEM_TYPES, serializeListItemBlock } from "./serialize/lists";
import { blockNoteBlockToMarkdown } from "./serialize/block";

function isBlankParagraph(block: any): boolean {
  if (block?.type !== "paragraph") return false;
  const content = block.content;
  if (content == null || content === "") return true;
  if (!Array.isArray(content)) return false;
  return content.every((part) => part == null || part === "" || part?.text === "");
}

function keepEmpty(block: any): boolean {
  return Boolean(block?.props?.[LOCAL_PRESERVE_EMPTY_PARAGRAPH]) || (Array.isArray(block?.children) && block.children.length > 0);
}

function holdsOwnChildren(block: any): boolean {
  return CHILDREN_CONSUMED_TYPES.has(block?.type) || (block?.type === "heading" && Boolean(block?.props?.isToggleable));
}

/**
 * 序列化块数组（顶层或任意嵌套层）。
 * 连续列表项用单换行接成一个列表；其余块之间空一行。
 * 标了保留的空段写成额外空行，不写 HTML 注释。
 */
function serializeBlocks(blocks: any[], indent: string, scope: MarkdownScope): string {
  const parts: MarkdownPart[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (!block || typeof block !== "object") {
      index += 1;
      continue;
    }
    if (block.type === "columnLayout") {
      const markdown = serializeColumns(block, indent, scope, serializeBlocks);
      if (markdown) parts.push({ kind: "flow", md: markdown });
      index += 1;
      continue;
    }
    if (block.type === "columnSection") {
      const markdown = serializeBlocks(block.children ?? [], indent, scope);
      if (markdown) parts.push({ kind: "flow", md: markdown });
      index += 1;
      continue;
    }
    if (isBlankParagraph(block) && !keepEmpty(block)) {
      index += 1;
      continue;
    }
    if (LIST_ITEM_TYPES.has(block.type)) {
      const lines: string[] = [];
      let counter: number | null = null;
      while (index < blocks.length && LIST_ITEM_TYPES.has(blocks[index]?.type)) {
        const item = blocks[index];
        if (item.type === "numberedListItem") {
          const explicitStart = item.props?.start;
          counter = typeof explicitStart === "number" ? explicitStart : counter == null ? 1 : counter + 1;
        } else {
          counter = null;
        }
        const taken = scope.take(item);
        lines.push(serializeListItemBlock(taken.block, indent, counter, (children, childIndent) =>
          serializeBlocks(children, childIndent, scope.child(taken.path))));
        index += 1;
      }
      parts.push({ kind: "list", md: lines.join("\n") });
      continue;
    }
    const at = scope.index;
    const taken = scope.take(block);
    const markdown = blockNoteBlockToMarkdown(taken.block, indent, (children, childIndent) =>
      serializeBlocks(children, childIndent, scope.child(taken.path)));
    if (isBlankParagraph(block)) parts.push({ kind: "empty", md: "" });
    else if (markdown !== "") parts.push({ kind: "flow", md: markdown });
    if (!holdsOwnChildren(block) && Array.isArray(block.children) && block.children.length > 0) {
      const start = scope.index;
      const childMarkdown = serializeBlocks(block.children, indent, scope);
      const count = scope.index - start;
      if (count > 0) scope.sink.nest({ path: scope.path, at, count });
      if (childMarkdown) parts.push({ kind: "flow", md: childMarkdown });
    }
    index += 1;
  }
  return joinBlocks(parts);
}

export function jsonContentToMarkdown(content: BlockNoteContent, skipFirstH1 = false): string {
  if (!isBlockNoteContent(content)) return "";
  let blocks = content as any[];
  if (skipFirstH1 && blocks[0]?.type === "heading") blocks = blocks.slice(1);
  const sink = createNoteSink();
  const body = serializeBlocks(blocks, "", new MarkdownScope("", sink));
  return attachNoteMeta(body, sink.finish());
}
