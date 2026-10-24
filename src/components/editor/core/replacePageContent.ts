import type { PartialBlock } from "@blocknote/core";
import { Fragment } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { blockToEditorNode } from "./fastBlockToNode";

export function replacePageContent(tr: Transaction, blocks: PartialBlock<any, any, any>[]): Transaction {
  const schema = tr.doc.type.schema;
  const group = schema.nodes.blockGroup.createChecked(
    null,
    blocks.map((block) => blockToEditorNode(block as Parameters<typeof blockToEditorNode>[0], schema)),
  );
  group.check();
  return tr.replaceWith(0, tr.doc.content.size, Fragment.from(group))
    .setMeta("addToHistory", false);
}
