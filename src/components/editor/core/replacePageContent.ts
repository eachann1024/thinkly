import type { PartialBlock } from "@blocknote/core";
import { Fragment, type Node, type Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { samePageNode } from "./pageNodeComparison";
import { blockToEditorNode } from "./fastBlockToNode";

export function pageContentGroup(schema: Schema, blocks: PartialBlock<any, any, any>[]): Node {
  const group = schema.nodes.blockGroup.createChecked(
    null,
    blocks.map((block) => blockToEditorNode(block as Parameters<typeof blockToEditorNode>[0], schema)),
  );
  group.check();
  return group;
}

export function replacePageContent(tr: Transaction, blocks: PartialBlock<any, any, any>[]): Transaction {
  const group = pageContentGroup(tr.doc.type.schema, blocks);
  const current = tr.doc.firstChild;
  if (!current || tr.doc.childCount !== 1 || !current.sameMarkup(group)) {
    return tr.replaceWith(0, tr.doc.content.size, Fragment.from(group)).setMeta("addToHistory", false);
  }
  let prefix = 0;
  let from = 1;
  while (prefix < current.childCount && prefix < group.childCount && samePageNode(current.child(prefix), group.child(prefix))) {
    from += current.child(prefix++).nodeSize;
  }
  let oldEnd = current.childCount;
  let newEnd = group.childCount;
  let to = 1 + current.content.size;
  while (oldEnd > prefix && newEnd > prefix && samePageNode(current.child(oldEnd - 1), group.child(newEnd - 1))) {
    to -= current.child(--oldEnd).nodeSize;
    newEnd--;
  }
  if (prefix === oldEnd && prefix === newEnd) return tr;
  const replacement: Node[] = [];
  for (let index = prefix; index < newEnd; index++) replacement.push(group.child(index));
  return tr.replaceWith(from, to, Fragment.fromArray(replacement)).setMeta("addToHistory", false);
}
