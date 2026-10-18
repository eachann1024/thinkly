import { dataAttr } from "../persistedNames";
import { blockNoteInlineToText, escapePipeInCell } from "./inline";
import { tableColorStyle, tableHtmlEscape, tableInlineHtml } from "../tableHtml";

export function serializeTable(block: any): string {
  const content = block.content;
  const rows: any[][] = Array.isArray(content?.rows)
    ? content.rows.map((row: any) => row.cells || [])
    : Array.isArray(content) ? content.map((row: any) => row.content || []) : [];
  if (!rows.length) return "";
  const needsHtmlInline = (value: any): boolean => {
    if (typeof value === "string") return /[\\`*_[\]<>~&|\r\n]|^\s|\s$/.test(value);
    if (Array.isArray(value)) return value.some(needsHtmlInline);
    if (!value) return false;
    if (value.type === "tableCell" || value.type === "paragraph") return needsHtmlInline(value.content);
    if (value.type !== "text") return true;
    return Object.values(value.styles || {}).some((style) => style !== false && style !== "default") || needsHtmlInline(value.text || "");
  };
  const isRichCell = (cell: any) => {
    const props = cell?.props ?? {};
    return (props.colspan ?? 1) > 1 || (props.rowspan ?? 1) > 1 ||
      ["textColor", "backgroundColor"].some((key) => props[key] && props[key] !== "default") ||
      (props.textAlignment && props.textAlignment !== "left") || needsHtmlInline(cell);
  };
  const rich = rows.some((row) => row.some(isRichCell)) ||
    content?.columnWidths?.some((width: unknown) => typeof width === "number") ||
    content?.headerRows !== 1 || content?.headerCols ||
    (block.props?.textColor && block.props.textColor !== "default");
  if (!rich) {
    const count = Math.max(...rows.map((row) => row.length), 1);
    const rowText = (cells: any[]) => `| ${Array.from({ length: count }, (_, index) => escapePipeInCell(blockNoteInlineToText(cells[index]))).join(" | ")} |`;
    return [rowText(rows[0]), `| ${new Array(count).fill("---").join(" | ")} |`, ...rows.slice(1).map(rowText)].join("\n");
  }
  const headerRows = content?.headerRows || 0;
  const headerCols = content?.headerCols || 0;
  const widths: (number | undefined)[] = content?.columnWidths ?? [];
  const color = block.props?.textColor;
  const opening = `<table ${dataAttr("table")}="v1" data-header-rows="${headerRows}" data-header-cols="${headerCols}"${color && color !== "default" ? ` ${dataAttr("text-color")}="${tableHtmlEscape(color)}" style="${tableHtmlEscape(tableColorStyle(block.props))}"` : ""}>`;
  const columns = widths.length ? `<colgroup>${widths.map((width) => typeof width === "number" && Number.isFinite(width) && width > 0 ? `<col style="width:${width}px">` : "<col>").join("")}</colgroup>` : "";
  const htmlRows = rows.map((row, rowIndex) => {
    let column = 0;
    return `<tr>${row.map((cell) => {
      const props = cell?.props ?? {};
      const colspan = Math.max(1, Math.floor(Number(props.colspan) || 1));
      const rowspan = Math.max(1, Math.floor(Number(props.rowspan) || 1));
      const tag = rowIndex < headerRows || column < headerCols ? "th" : "td";
      column += colspan;
      const attrs = [`colspan="${colspan}"`, `rowspan="${rowspan}"`];
      for (const [key, attribute] of [["textColor", dataAttr("text-color")], ["backgroundColor", dataAttr("background-color")], ["textAlignment", dataAttr("text-alignment")]]) {
        if (props[key] && props[key] !== "default") attrs.push(`${attribute}="${tableHtmlEscape(props[key])}"`);
      }
      const style = tableColorStyle(props);
      if (style) attrs.push(`style="${tableHtmlEscape(style)}"`);
      return `<${tag} ${attrs.join(" ")}>${tableInlineHtml(cell)}</${tag}>`;
    }).join("")}</tr>`;
  });
  return [opening, ...(columns ? [columns] : []), "<tbody>", ...htmlRows, "</tbody>", "</table>"].join("\n");
}
