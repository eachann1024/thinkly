import type { Node } from "@tiptap/pm/model";

export function samePageMarkup(before: Node, after: Node): boolean {
  const attrs = "id" in after.attrs
    ? { ...after.attrs, id: before.attrs.id }
    : after.attrs;
  return before.hasMarkup(after.type, attrs, after.marks);
}

export function samePageNode(before: Node, after: Node): boolean {
  if (before.eq(after)) return true;
  if (!samePageMarkup(before, after) || before.text !== after.text || before.childCount !== after.childCount) return false;
  for (let index = 0; index < before.childCount; index++) {
    if (!samePageNode(before.child(index), after.child(index))) return false;
  }
  return true;
}
