import type { CardTheme } from "../themes";
import { normalizeColumnLayout, readColumnWidths } from "@/components/editor/blocks/columns/columnModel";

/** 分享图里保持编辑器的左右栏比例；每栏内容仍走通用块渲染。 */
export function renderColumnsBlock(
  block: any,
  theme: CardTheme,
  renderBlocks: (blocks: any[], theme: CardTheme) => string,
): string {
  const layout = normalizeColumnLayout(block, Array.isArray(block.children) ? block.children : []);
  const sections = layout.children ?? [];
  const template = readColumnWidths(layout.props?.widths, sections.length)
    .map((width) => `minmax(0,${width}fr)`)
    .join(" ");
  const columns = sections
    .map((section) => `<div class="export-column">${renderBlocks(section.children ?? [], theme)}</div>`)
    .join("");
  return `<div class="export-columns" style="grid-template-columns:${template}">${columns}</div>`;
}
