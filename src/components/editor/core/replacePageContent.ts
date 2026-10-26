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
  const next = tr.doc.type.create(tr.doc.attrs, Fragment.from(group));
  const start = tr.doc.content.findDiffStart(next.content);
  if (start === null) return tr;
  const end = tr.doc.content.findDiffEnd(next.content)!;
  const overlap = start - Math.min(end.a, end.b);
  return tr.replace(start, end.a + Math.max(0, overlap), next.slice(start, end.b + Math.max(0, overlap)))
    .setMeta("addToHistory", false);
}
