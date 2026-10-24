import { blockNoteInlineToText } from "./inline";


export function legacyItemInline(item: any): string {
  return blockNoteInlineToText(
    Array.isArray(item?.content) && item.content[0]?.type === "paragraph"
      ? item.content[0].content
      : item?.content,
  );
}

export function serializeLegacyListItem(item: any, indent: string): string {
  if (!item || typeof item !== "object") return "";
  const childIndent = indent + "  ";
  const children: string[] = Array.isArray(item.children)
    ? item.children
        .map((c: any) => serializeLegacyListItem(c, childIndent))
        .filter(Boolean)
    : [];

  let line: string;
  if (item.type === "taskItem") {
    const checked =
      item?.attrs?.checked === true || item?.props?.checked === true;
    line = `${indent}- [${checked ? "x" : " "}] ${legacyItemInline(item)}`;
  } else if (item.type === "listItem") {
    if (item.attrs?.start != null) {
      line = `${indent}${item.attrs.start}. ${legacyItemInline(item)}`;
    } else {
      line = `${indent}- ${legacyItemInline(item)}`;
    }
  } else {
    line = `${indent}${blockNoteInlineToText(item.content)}`;
  }

  return children.length ? line + "\n" + children.join("\n") : line;
}
