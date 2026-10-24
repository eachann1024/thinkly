import { Table, TableCell, TableRow, VerticalAlign, WidthType } from "docx";
import { normalizeColumnLayout, readColumnWidths } from "@/components/editor/blocks/columns/columnModel";
import { DOCX_CELL_BORDERS_NONE, tightParagraph, type DocxBlockChild } from "./docxLayout";
import { DOCX_CONTENT_WIDTH_DXA, DOCX_CONTENT_WIDTH_PX } from "./docxTheme";
import type { DocxExportContext } from "./docxBlockContext";

const COLUMN_GAP_DXA = 360;

type RenderChildren = (blocks: unknown[], ctx: DocxExportContext) => Promise<DocxBlockChild[]>;

export async function columnsToTable(
  block: Record<string, unknown>,
  ctx: DocxExportContext,
  renderChildren: RenderChildren,
): Promise<DocxBlockChild[]> {
  const layout = normalizeColumnLayout(block as any, Array.isArray(block.children) ? block.children as any[] : []);
  const sections = layout.children ?? [];
  const ratios = readColumnWidths(layout.props?.widths, sections.length);
  const outerWidth = ctx.contentWidthPx ?? DOCX_CONTENT_WIDTH_PX;
  const totalDxa = Math.round(DOCX_CONTENT_WIDTH_DXA * outerWidth / DOCX_CONTENT_WIDTH_PX);
  const usableDxa = totalDxa - COLUMN_GAP_DXA * (sections.length - 1);
  const isLast = (index: number) => index === sections.length - 1;
  const widthsDxa = ratios.map((ratio, index) =>
    Math.round(usableDxa * ratio / 100) + (isLast(index) ? 0 : COLUMN_GAP_DXA));
  const cells: TableCell[] = [];
  for (const [index, section] of sections.entries()) {
    const widthPx = Math.floor(outerWidth * ratios[index] / 100);
    const children = await renderChildren(section.children ?? [], { ...ctx, contentWidthPx: widthPx });
    cells.push(new TableCell({
      children: children.length ? children : [tightParagraph({})],
      width: { size: widthsDxa[index], type: WidthType.DXA },
      borders: DOCX_CELL_BORDERS_NONE,
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 0, bottom: 0, left: 0, right: isLast(index) ? 0 : COLUMN_GAP_DXA },
    }));
  }
  return [new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: totalDxa, type: WidthType.DXA },
    columnWidths: widthsDxa,
    borders: { ...DOCX_CELL_BORDERS_NONE, insideHorizontal: DOCX_CELL_BORDERS_NONE.top, insideVertical: DOCX_CELL_BORDERS_NONE.top },
  })];
}
