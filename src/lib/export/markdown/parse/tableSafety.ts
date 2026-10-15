import { tableColorStyle } from "../tableHtml";

const ATTRIBUTES: Record<string, string[]> = {
  table: ["data-goose-table", "data-header-rows", "data-header-cols", "data-goose-text-color", "style"],
  colgroup: [], col: ["style"], tbody: [], tr: [],
  td: ["colspan", "rowspan", "data-goose-text-color", "data-goose-background-color", "data-goose-text-alignment", "style"],
  th: ["colspan", "rowspan", "data-goose-text-color", "data-goose-background-color", "data-goose-text-alignment", "style"],
  a: ["href", "data-goose-page-mention"], span: ["data-goose-text-color", "data-goose-background-color", "style"],
  strong: [], b: [], em: [], i: [], u: [], del: [], s: [], code: [], br: [],
};

/** 只恢复能完整表达的结构。手改/损坏 HTML 回退原文，避免 DOM 修复时悄悄丢内容。 */
export function isLosslessTableDocument(document: Document, table: HTMLTableElement): boolean {
  if (document.head.childNodes.length || Array.from(document.body.childNodes)
    .some((node) => node !== table && (node.nodeType !== 3 || node.textContent?.trim()))) return false;
  if (table.querySelector("table") || !table.rows.length) return false;
  const elements = [table, ...Array.from(table.querySelectorAll("*"))];
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    const allowed = ATTRIBUTES[tag];
    if (!allowed || Array.from(element.attributes).some((attribute) => !allowed.includes(attribute.name))) return false;
    if (Array.from(element.childNodes).some((node) => node.nodeType !== 1 && node.nodeType !== 3)) return false;
    if (element.hasAttribute("style")) {
      if (tag === "col") {
        if (!/^width:\s*\d+(?:\.\d+)?px;?$/.test(element.getAttribute("style") || "")) return false;
      } else {
        const expected = tableColorStyle({
          textColor: element.getAttribute("data-goose-text-color"),
          backgroundColor: element.getAttribute("data-goose-background-color"),
          textAlignment: element.getAttribute("data-goose-text-alignment"),
        });
        if (element.getAttribute("style") !== expected) return false;
      }
    }
  }
  const rows = Array.from(table.rows);
  const occupied: boolean[][] = rows.map(() => []);
  let width = 0;
  for (let row = 0; row < rows.length; row += 1) {
    let column = 0;
    for (const cell of Array.from(rows[row].cells)) {
      while (occupied[row][column]) column += 1;
      if (!cell.rowSpan || cell.rowSpan + row > rows.length || column + cell.colSpan > 10000) return false;
      for (let y = row; y < row + cell.rowSpan; y += 1) {
        for (let x = column; x < column + cell.colSpan; x += 1) {
          if (occupied[y][x]) return false;
          occupied[y][x] = true;
        }
      }
      column += cell.colSpan;
    }
    width = Math.max(width, occupied[row].length);
  }
  const columns = table.querySelectorAll(":scope > colgroup > col").length;
  if (columns && columns !== width) return false;
  return width > 0 && occupied.every((row) => row.length === width && Array.from({ length: width }, (_, index) => row[index]).every(Boolean));
}
