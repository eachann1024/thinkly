import {
  blockHasType,
  defaultProps,
  editorHasBlockWithType,
  mapTableCell,
  type BlockNoteEditor,
  type TableContent,
} from "@blocknote/core";
import type { FormattingTextAlignment } from "./formattingCapabilities";
import { getSelectedBlocksSafe } from "./selectionBlocks";
import {
  getCellSelectionSafe,
  type CellSelectionInfo,
} from "./tableCellSelection";
import { withPreservedSelection } from "./selectionRestore";

/**
 * Apply text alignment to the current selection.
 * Follows BlockNote TextAlignButton: block props for paragraphs, cell props for tables.
 */
function applyAlignmentToSelection(
  editor: BlockNoteEditor<any, any, any>,
  alignment: FormattingTextAlignment,
  blocks: any[],
  cellSelection: CellSelectionInfo | undefined,
): void {
  for (const block of blocks) {
    if (
      blockHasType(block, editor, block.type, {
        textAlignment: defaultProps.textAlignment,
      }) &&
      editorHasBlockWithType(editor, block.type, {
        textAlignment: defaultProps.textAlignment,
      })
    ) {
      editor.updateBlock(block, {
        props: { textAlignment: alignment },
      });
      continue;
    }

    if (block.type !== "table") continue;

    if (!cellSelection?.cells?.length) continue;

    const content = block.content as TableContent<any, any>;
    if (!content?.rows) continue;

    const newTable = content.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => mapTableCell(cell)),
    }));

    for (const { row, col } of cellSelection.cells) {
      const target = newTable[row]?.cells?.[col];
      if (!target) continue;
      target.props.textAlignment = alignment;
    }

    editor.updateBlock(block, {
      type: "table",
      content: {
        ...content,
        type: "tableContent",
        rows: newTable,
      } as any,
    });
  }
}
export function applySelectionTextAlignment(
  editor: BlockNoteEditor<any, any, any>,
  alignment: FormattingTextAlignment,
): void {
  // transact 回调内读 prosemirrorState 会抛错，选区解析必须先于事务完成
  const blocks = getSelectedBlocksSafe(editor);
  const cellSelection = getCellSelectionSafe(editor);
  withPreservedSelection(editor, () => {
    editor.transact(() => {
      applyAlignmentToSelection(editor, alignment, blocks, cellSelection);
    });
  });
}

const CLEARABLE_MARKS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "textColor",
  "backgroundColor",
] as const;

/**
 * 清格式必须改当前事务。removeStyles 会另开一条 TipTap 事务，
 * 包在 editor.transact 里时修改到不了文档。
 */
function clearMarksInTransaction(editor: BlockNoteEditor<any, any, any>): void {
  editor.transact((tr) => {
    const types = CLEARABLE_MARKS.map((name) => editor.pmSchema.marks[name]).filter(Boolean);
    if (!tr.selection.empty) {
      for (const range of tr.selection.ranges) {
        for (const type of types) tr.removeMark(range.$from.pos, range.$to.pos, type);
      }
    }
    if (tr.storedMarks) {
      tr.setStoredMarks(tr.storedMarks.filter((mark) => !types.includes(mark.type)));
    }
  });
}

/**
 * Clear inline marks / colors and reset text alignment on the selection.
 */
export function clearSelectionFormatting(
  editor: BlockNoteEditor<any, any, any>,
): void {
  const blocks = getSelectedBlocksSafe(editor);
  const cellSelection = getCellSelectionSafe(editor);
  withPreservedSelection(editor, () => {
    clearMarksInTransaction(editor);
    editor.transact(() => {
      applyAlignmentToSelection(editor, "left", blocks, cellSelection);
    });
  });
}
