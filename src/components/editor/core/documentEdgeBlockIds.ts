import type { Node } from "@tiptap/pm/model";

export function documentEdgeBlockIds(doc: Node) {
  const group = doc.firstChild;
  return {
    first: group?.firstChild?.attrs.id as string | undefined,
    last: group?.lastChild?.attrs.id as string | undefined,
  };
}
