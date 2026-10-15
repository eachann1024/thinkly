import { normalizeColumnLayout } from "@/components/editor/blocks/columns/columnModel";

export function serializeColumns(block: any, serializeBlocks: (blocks: any[], indent: string) => string, indent = ""): string {
  const layout = normalizeColumnLayout(block, block.children ?? []);
  const sections = layout.children!.map((section) => [
    "<!-- goose-note:column -->",
    serializeBlocks(section.children ?? [], ""),
    "<!-- /goose-note:column -->",
  ].join("\n\n"));
  return [`<!-- goose-note:columns widths="${layout.props!.widths}" -->`, ...sections, "<!-- /goose-note:columns -->"].join("\n\n").split("\n").map((line) => indent + line).join("\n");
}
