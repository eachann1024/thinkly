import type { Node } from "@tiptap/pm/model";

// A background or an explicit line break may extend a paragraph's surface,
// but must never change the editing behavior of headings or list items.
export function isContainedBlockContent(
  content: Node,
  offset = content.content.size,
): boolean {
  const type = content.type.name;
  if (type === "callout" || type === "quote") return true;
  if (type !== "paragraph") return false;
  const background = content.attrs.backgroundColor;
  if (background && background !== "default") return true;
  let continuation = false;
  content.forEach((node, pos) => {
    if (pos < offset && node.type.name === "hardBreak") continuation = true;
  });
  return continuation;
}
