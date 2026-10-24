import { normalizeColumnLayout } from "@/components/editor/blocks/columns/columnModel";
import type { MarkdownScope } from "../noteMeta";

export function serializeColumns(
  block: any,
  indent: string,
  scope: MarkdownScope,
  serializeBlocks: (blocks: any[], indent: string, scope: MarkdownScope) => string,
): string {
  const layout = normalizeColumnLayout(block, block.children ?? []);
  const at = scope.index;
  const counts: number[] = [];
  const parts: string[] = [];
  for (const section of layout.children ?? []) {
    const before = scope.index;
    const markdown = serializeBlocks(section.children ?? [], "", scope);
    counts.push(scope.index - before);
    if (markdown) parts.push(markdown);
  }
  if (counts.some((count) => count > 0)) {
    scope.sink.column({ path: scope.path, at, widths: String(layout.props?.widths ?? ""), counts });
  }
  const body = parts.join("\n\n");
  return indent ? body.split("\n").map((line) => (line ? indent + line : line)).join("\n") : body;
}
