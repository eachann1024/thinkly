import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

function rangeHasHeading(doc: Node, from: number, to: number): boolean {
  let found = false;
  doc.nodesBetween(from, to, (node, pos) => {
    if (
      node.type.name === "heading" ||
      (pos === from &&
        node.type.name === "blockContainer" &&
        node.firstChild?.type.name === "heading")
    )
      found = true;
    return !found;
  });
  return found;
}

/** Inspect each step in its own document coordinates, including removed headings. */
export function transactionTouchesHeadings(transaction: Transaction): boolean {
  if (!transaction.docChanged) return false;
  return transaction.steps.some((step, index) => {
    const before = transaction.docs[index];
    const after = transaction.docs[index + 1] ?? transaction.doc;
    let hasRange = false;
    let touchesHeading = false;
    step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
      hasRange = true;
      if (
        rangeHasHeading(before, oldStart, oldEnd) ||
        rangeHasHeading(after, newStart, newEnd)
      )
        touchesHeading = true;
    });
    if (hasRange) return touchesHeading;

    // Marks and attribute steps can change a heading without a position map.
    const { from, to, pos } = step as {
      from?: number;
      to?: number;
      pos?: number;
    };
    if (typeof from === "number" && typeof to === "number") {
      return (
        rangeHasHeading(before, from, to) || rangeHasHeading(after, from, to)
      );
    }
    if (typeof pos === "number") {
      return (
        rangeHasHeading(before, pos, Math.min(pos + 1, before.content.size)) ||
        rangeHasHeading(after, pos, Math.min(pos + 1, after.content.size))
      );
    }
    // Unknown custom steps must not silently leave the outline stale.
    return true;
  });
}
