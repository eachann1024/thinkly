import { splitTrailingListLines } from "../listLines";
import { blockNoteInlineToText } from "./inline";
import { wrapLocalBlockPropsMarkdown } from "../localBlockPropsWrappers";

export const LIST_ITEM_TYPES = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
]);

export const CHILDREN_CONSUMED_TYPES = new Set([
  "toggleListItem",
  "details",
  "bulletList",
  "orderedList",
  "taskList",
]);

export function serializeListItemBlock(
  item: any,
  indent: string,
  num: number | null,
  serializeBlocks: (blocks: any[], indent: string) => string,
): string {
  const broken = splitTrailingListLines(blockNoteInlineToText(item.content, false));
  const text = broken.head.split("\n").join("<br>");
  let marker: string;
  let childIndentWidth: number;
  if (item.type === "checkListItem") {
    marker = `- [${item.props?.checked ? "x" : " "}] `;
    childIndentWidth = 2;
  } else if (item.type === "numberedListItem") {
    marker = `${num ?? 1}. `;
    childIndentWidth = marker.length;
  } else {
    marker = "- ";
    childIndentWidth = 2;
  }
  let line = wrapLocalBlockPropsMarkdown(item, `${indent}${marker}${text}`);
  if (broken.lists.length) {
    const nestedIndent = indent + " ".repeat(childIndentWidth);
    line += "\n" + broken.lists.map((entry) => `${nestedIndent}${entry}`).join("\n");
  }
  if (Array.isArray(item.children) && item.children.length > 0) {
    const allListChildren = item.children.every((child: any) =>
      LIST_ITEM_TYPES.has(child?.type),
    );
    const childPrefix = indent + " ".repeat(childIndentWidth);
    const childMd = serializeBlocks(
      item.children,
      allListChildren ? childPrefix : "",
    );
    if (childMd) {
      line += "\n" + (allListChildren
        ? childMd
        : childMd
            .split("\n")
            .map((childLine) => childLine ? childPrefix + childLine : "")
            .join("\n"));
    }
  }
  return line;
}
