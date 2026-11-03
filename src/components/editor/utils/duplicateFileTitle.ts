import type { Node as PMNode } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

export function collapseTitleWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isDuplicateFileTitleText(
  headingText: string,
  fileTitle: string | null | undefined,
): boolean {
  if (!fileTitle) return false;
  const heading = collapseTitleWhitespace(headingText);
  const title = collapseTitleWhitespace(fileTitle);
  return heading.length > 0 && heading === title;
}

export type DuplicateFileTitleBlock = {
  id: string;
  pos: number;
  node: PMNode;
};

function isFrontmatterContainer(node: PMNode): boolean {
  const content = node.firstChild;
  return node.type.name === "blockContainer" &&
    content?.type.name === "codeBlock" &&
    content.attrs?.language === "yaml-frontmatter";
}

export function findDuplicateFileTitleBlock(
  doc: PMNode,
  fileTitle: string | null | undefined,
): DuplicateFileTitleBlock | null {
  if (!fileTitle) return null;
  const group = doc.firstChild;
  if (!group || group.type.name !== "blockGroup" || group.childCount < 1) return null;
  let container = group.child(0);
  let pos = 1;
  if (isFrontmatterContainer(container)) {
    if (group.childCount < 2) return null;
    pos += container.nodeSize;
    container = group.child(1);
  }
  if (container.type.name !== "blockContainer" || container.childCount !== 1) return null;
  const content = container.firstChild;
  if (!content || content.type.name !== "heading" || Number(content.attrs?.level) !== 1) return null;
  const text = content.textBetween(0, content.content.size, "\n", "\n");
  if (!isDuplicateFileTitleText(text, fileTitle)) return null;
  const id = container.attrs?.id;
  if (typeof id !== "string" || !id) return null;
  return { id, pos, node: container };
}

export function selectionInsideDuplicateTitle(
  selection: Selection,
  match: DuplicateFileTitleBlock,
): boolean {
  const start = match.pos;
  const end = start + match.node.nodeSize;
  if (selection.from < start || selection.to > end) return false;
  if (selection.empty && (selection.from <= start || selection.from >= end)) return false;
  return true;
}

export function selectionAfterDuplicateTitle(
  doc: PMNode,
  match: DuplicateFileTitleBlock,
): TextSelection | null {
  const after = match.pos + match.node.nodeSize;
  const next = TextSelection.findFrom(doc.resolve(after), 1, true);
  return next instanceof TextSelection ? next : null;
}
