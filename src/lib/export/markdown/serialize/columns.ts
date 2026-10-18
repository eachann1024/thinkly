import { normalizeColumnLayout } from "@/components/editor/blocks/columns/columnModel";
import { noteComment, noteCommentClose } from "../persistedNames";

export function serializeColumns(block: any, serializeBlocks: (blocks: any[], indent: string) => string, indent = ""): string {
  const layout = normalizeColumnLayout(block, block.children ?? []);
  const sections = layout.children!.map((section) => [
    noteComment("column"),
    serializeBlocks(section.children ?? [], ""),
    noteCommentClose("column"),
  ].join("\n\n"));
  return [noteComment(`columns widths="${layout.props!.widths}"`), ...sections, noteCommentClose("columns")].join("\n\n").split("\n").map((line) => indent + line).join("\n");
}
