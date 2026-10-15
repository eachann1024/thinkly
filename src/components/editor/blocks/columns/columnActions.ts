import type { BlockNoteEditor } from "@blocknote/core";
import { getProtectedTitleBlockId } from "../../utils/documentTitlePolicy";
import { getBlocksToMove } from "../../extensions/moveBlockExtension";
import { COLUMN_LAYOUT, COLUMN_SECTION, columnWidthsProp, createColumnsBlock, firstColumnBlock, readColumnWidths } from "./columnModel";

type Editor = BlockNoteEditor<any, any, any>;

export function findColumnsContext(editor: Editor, id: string) {
  let block = editor.getBlock(id);
  let section: any;
  while (block) {
    if (block.type === COLUMN_SECTION) section = block;
    if (block.type === COLUMN_LAYOUT) return { layout: block, section };
    block = editor.getParentBlock(block);
  }
  return undefined;
}

/** 仅接收同一父级的连续根块，避免跨层选择重复搬移子树。 */
export function canConvertBlocksToColumns(editor: Editor, blocks = getBlocksToMove(editor) as any[]): boolean {
  if (!editor.isEditable || !blocks.length) return false;
  const title = getProtectedTitleBlockId(editor);
  if (blocks.some((block) => block.id === title || block.type === COLUMN_SECTION)) return false;
  const parent = editor.getParentBlock(blocks[0]);
  if (blocks.some((block) => editor.getParentBlock(block)?.id !== parent?.id)) return false;
  return blocks.every((block, index) => index === 0 || editor.getNextBlock(blocks[index - 1])?.id === block.id);
}

export function convertBlocksToColumns(editor: Editor, count: 2 | 3, blocks = getBlocksToMove(editor) as any[]): boolean {
  if (!canConvertBlocksToColumns(editor, blocks)) return false;
  if (blocks.length === 1 && blocks[0].type === COLUMN_LAYOUT) {
    const layout = blocks[0];
    const sections = [...layout.children];
    const widths = readColumnWidths(layout.props.widths, sections.length);
    if (sections.length > count) {
      const tail = sections.splice(count);
      sections[count - 1] = { ...sections[count - 1], children: [...sections[count - 1].children, ...tail.flatMap((section) => section.children)] };
      widths[count - 1] += widths.splice(count).reduce((sum, width) => sum + width, 0);
    }
    while (sections.length < count) sections.push({ type: COLUMN_SECTION, children: [{ type: "paragraph" }] });
    editor.updateBlock(layout, { children: sections, props: { widths: columnWidthsProp(readColumnWidths(widths.length === count ? columnWidthsProp(widths) : undefined, count)) } });
    editor.focus();
    return true;
  }
  editor.transact(() => {
    const { insertedBlocks } = editor.replaceBlocks(blocks, [createColumnsBlock(count, blocks) as any]);
    const target = firstColumnBlock(insertedBlocks[0]);
    if (target) editor.setTextCursorPosition(target, "start");
  });
  editor.focus();
  return true;
}

/** 拆除整组布局，按栏顺序还原完整块及其 children。 */
export function moveColumnsToBody(editor: Editor, blockId?: string): boolean {
  const id = blockId ?? (getBlocksToMove(editor)[0] as any)?.id;
  const context = id ? findColumnsContext(editor, id) : undefined;
  if (!context || !editor.isEditable) return false;
  const blocks = context.layout.children.flatMap((section: any) => section.type === COLUMN_SECTION ? section.children : [section]);
  editor.transact(() => {
    const { insertedBlocks } = editor.replaceBlocks([context.layout], blocks.length ? blocks : [{ type: "paragraph" }]);
    const target = firstColumnBlock(insertedBlocks[0]);
    if (target) editor.setTextCursorPosition(target, "start");
  });
  editor.focus();
  return true;
}

export function insertColumnsFromSlash(editor: Editor, count: 2 | 3): void {
  const block = editor.getTextCursorPosition().block;
  // clearQuery 已移除斜杠文本；真实内容或子树通过同一原子替换完整移入第一栏。
  if (block.id === getProtectedTitleBlockId(editor)) {
    const [layout] = editor.insertBlocks([createColumnsBlock(count) as any], block, "after");
    const target = firstColumnBlock(layout);
    if (target) editor.setTextCursorPosition(target, "start");
    editor.focus();
    return;
  }
  convertBlocksToColumns(editor, count, [block]);
}
