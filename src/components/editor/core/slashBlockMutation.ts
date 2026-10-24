import {
  getBlockInfoFromTransaction,
  nodeToBlock,
  updateBlockTr,
  type BlockNoteEditor,
} from "@blocknote/core";
import { NodeSelection, TextSelection } from "prosemirror-state";

// The selection already identifies this block. Avoid searching every block by ID.
export function updateCurrentSlashBlock(editor: BlockNoteEditor<any, any, any>, update: any) {
  return editor.transact((tr) => {
    const before = getBlockInfoFromTransaction(tr).bnBlock.beforePos;
    updateBlockTr(tr, before, update);
    const blockNode = tr.doc.resolve(before + 1).node();
    const content = blockNode.firstChild!;
    const kind = editor.schema.blockSchema[update.type]?.content;
    const end = before + 1 + content.nodeSize;
    if (kind === "inline") {
      tr.setSelection(TextSelection.create(tr.doc, end - 1));
    } else if (kind === "table") {
      tr.setSelection(TextSelection.create(tr.doc, end - 4));
    } else {
      tr.setSelection(NodeSelection.create(tr.doc, before + 1));
    }
    return nodeToBlock(blockNode, tr.doc.type.schema);
  });
}
