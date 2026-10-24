import { readDataAttr } from "../persistedNames";
import { sanitizeCssColor } from "../blockPropsProperties";
import { parseTableInlineHtml } from "../tableHtml";
import { isLosslessTableDocument } from "./tableSafety";

export function parseTableHtmlBlock(lines: string[], start: number) {
  if (!/^<table\s+data-(?:thinkly|goose)-table="v1"(?:\s|>)/i.test(lines[start].trim())) return null;
  let end = start;
  while (end < lines.length && !/<\/table>\s*$/i.test(lines[end].trim())) end += 1;
  if (end >= lines.length) return null;
  const source = lines.slice(start, end + 1).join("\n");
  const document = new globalThis.DOMParser().parseFromString(source, "text/html");
  const table = document.querySelector("table");
  if (!table || !isLosslessTableDocument(document, table)) return { block: { type: "codeBlock", props: { language: "thinkly-raw-block" }, content: source }, nextIndex: end + 1 };
  const count = (value: string | null, max: number) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  const rows = Array.from(table.rows).map((row) => ({
    cells: Array.from(row.cells).map((cell) => {
      const props: Record<string, unknown> = { colspan: cell.colSpan, rowspan: cell.rowSpan };
      const textColor = sanitizeCssColor(readDataAttr(cell, "text-color"));
      const backgroundColor = sanitizeCssColor(readDataAttr(cell, "background-color"));
      const textAlignment = readDataAttr(cell, "text-alignment");
      if (textColor) props.textColor = textColor;
      if (backgroundColor) props.backgroundColor = backgroundColor;
      if (["left", "center", "right"].includes(textAlignment || "")) props.textAlignment = textAlignment;
      return { type: "tableCell", props, content: parseTableInlineHtml(cell) };
    }),
  }));
  const columns = Array.from(table.querySelectorAll(":scope > colgroup > col"));
  const columnWidths = columns.map((column) => {
    const width = Number((column as HTMLElement).style.width.replace(/px$/, ""));
    return width > 0 && Number.isFinite(width) ? width : undefined;
  });
  const textColor = sanitizeCssColor(readDataAttr(table, "text-color"));
  const sequenceColumn = readDataAttr(table, "sequence-column") === "true";
  const props = {
    ...(textColor ? { textColor } : {}),
    ...(sequenceColumn ? { sequenceColumn: true } : {}),
  };
  return {
    block: {
      type: "table",
      ...(Object.keys(props).length ? { props } : {}),
      content: {
        type: "tableContent", rows,
        ...(columnWidths.length ? { columnWidths } : {}),
        headerRows: count(table.getAttribute("data-header-rows"), rows.length),
        headerCols: count(table.getAttribute("data-header-cols"), 10000),
      },
    },
    nextIndex: end + 1,
  };
}
