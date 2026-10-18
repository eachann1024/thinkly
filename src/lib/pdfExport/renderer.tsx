import { TEXT_COLORS } from "@/lib/textColors";
import { Document, Page, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { PdfBlock, PdfContext, PdfBlockMapping } from "./blockTypes";
import { renderPdfInline } from "./pdfInline";
import { normalizeColumnLayout, readColumnWidths } from "@/components/editor/blocks/columns/columnModel";
export type { PdfBlock, PdfContext, PdfBlockMapping } from "./blockTypes";
export { pdfColor, blockTextStyle, splitPdfWord } from "./pdfTextStyle";
export { renderPdfInline } from "./pdfInline";
export { tableColumnPercentages } from "./pdfTable";
export { createDefaultPdfBlockMappings } from "./defaultBlockMappings";

export async function createPdfDocument(
  blocks: readonly PdfBlock[],
  mappings: Record<string, PdfBlockMapping>,
  fontFamily: string | string[],
) {
  const context: PdfContext = { transformInlineContent: renderPdfInline };
  async function renderBlocks(
    items: readonly PdfBlock[],
    depth: number,
  ): Promise<ReactNode[]> {
    const result: ReactNode[] = [];
    let ordinal = 0;
    for (const [index, block] of items.entries()) {
      if (block.type === "numberedListItem") {
        const start = block.props?.start;
        ordinal =
          typeof start === "number" && Number.isFinite(start)
            ? start
            : ordinal + 1;
      } else ordinal = 0;
      if (block.type === "columnLayout") {
        result.push(await renderColumns(block, index, depth));
        continue;
      }
      const mapping = mappings[block.type ?? "paragraph"] ?? mappings.paragraph;
      result.push(
        <View key={block.id ?? index} style={{ marginBottom: 6 }}>
          {await mapping(block, context, depth, ordinal)}
          {block.children?.length ? (
            <View style={{ marginLeft: 18, marginTop: 4 }}>
              {await renderBlocks(block.children, depth + 1)}
            </View>
          ) : null}
        </View>,
      );
    }
    return result;
  }
  async function renderColumns(block: PdfBlock, index: number, depth: number): Promise<ReactNode> {
    const layout = normalizeColumnLayout(block as any, (block.children ?? []) as any[]);
    const sections = (layout.children ?? []) as PdfBlock[];
    const widths = readColumnWidths(layout.props?.widths, sections.length);
    const columns: ReactNode[] = [];
    for (const [column, section] of sections.entries()) {
      columns.push(
        <View key={column} style={{ width: `${widths[column]}%`, paddingRight: column < sections.length - 1 ? 18 : 0 }}>
          {await renderBlocks(section.children ?? [], depth)}
        </View>,
      );
    }
    return (
      <View key={block.id ?? index} style={{ flexDirection: "row", marginBottom: 6 }}>
        {columns}
      </View>
    );
  }
  return (
    <Document>
      <Page
        size="A4"
        style={{
          padding: 36,
          fontFamily,
          fontSize: 12,
          lineHeight: 1.5,
          color: TEXT_COLORS.light.primary,
        }}
      >
        {await renderBlocks(blocks, 0)}
      </Page>
    </Document>
  );
}
