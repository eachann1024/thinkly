export const COLUMN_LAYOUT = "columnLayout";
export const COLUMN_SECTION = "columnSection";
export type ColumnBlock = { id?: string; type: string; props?: Record<string, any>; children?: ColumnBlock[]; [key: string]: any };

export function readColumnWidths(value: unknown, count: number): number[] {
  if (count < 1) return [];
  const raw = typeof value === "string" ? value.split(",").map(Number) : [];
  const valid = raw.length === count && raw.every((part) => Number.isFinite(part) && part > 0);
  const widths = valid ? raw : Array.from({ length: count }, () => 1);
  const total = widths.reduce((sum, part) => sum + part, 0);
  const units = widths.map((part) => Math.max(1, Math.round(part / total * 100000)));
  const largest = units.indexOf(Math.max(...units));
  units[largest] += 100000 - units.reduce((sum, part) => sum + part, 0);
  return units.map((part) => part / 1000);
}

export function columnWidthsProp(widths: number[]): string {
  return widths.map((width) => Math.round(width * 1000) / 1000).join(",");
}

export function createColumnsBlock(count: 2 | 3, blocks: ColumnBlock[] = []): ColumnBlock {
  return {
    type: COLUMN_LAYOUT,
    props: { widths: columnWidthsProp(readColumnWidths(undefined, count)) },
    children: Array.from({ length: count }, (_, index) => ({
      type: COLUMN_SECTION,
      children: index === 0 && blocks.length ? blocks : [{ type: "paragraph" }],
    })),
  };
}

export function normalizeColumnLayout(block: ColumnBlock, children: ColumnBlock[]): ColumnBlock {
  const sections: ColumnBlock[] = [];
  for (const child of children) {
    if (child.type === COLUMN_SECTION) {
      sections.push({ ...child, children: child.children?.length ? child.children : [{ type: "paragraph" }] });
    } else {
      sections.push({ type: COLUMN_SECTION, children: [child] });
    }
  }
  while (sections.length < 2) sections.push({ type: COLUMN_SECTION, children: [{ type: "paragraph" }] });
  return {
    ...block, type: COLUMN_LAYOUT,
    props: { ...block.props, widths: columnWidthsProp(readColumnWidths(block.props?.widths, sections.length)) },
    children: sections,
  };
}

export function firstColumnBlock(block: any, end = false): any {
  if (!block) return undefined;
  const children = block.children ?? [];
  if (block.type !== COLUMN_LAYOUT && block.type !== COLUMN_SECTION) {
    if (end && children.length && block.props?.collapsed !== true) return firstColumnBlock(children[children.length - 1], true) ?? block;
    return block;
  }
  for (const child of end ? [...children].reverse() : children) {
    const found = firstColumnBlock(child, end);
    if (found) return found;
  }
  return undefined;
}
