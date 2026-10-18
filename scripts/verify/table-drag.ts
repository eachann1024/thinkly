/**
 * 从表下方向上拖：选区停在指针那一行的文字位置，不把整张表选中。
 * 运行：node scripts/verify/run.mjs table-drag
 */
import { Schema } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { readFileSync } from "node:fs";
import {
  fullyCoveredCells,
  selectionBetweenPointer,
} from "@/components/editor/extensions/tableCellSelectionModel";
import { createChecker } from "./lib/check";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
    table: { group: "block", content: "table_row+", tableRole: "table" },
    table_row: { content: "table_cell+", tableRole: "row" },
    table_cell: {
      content: "paragraph",
      tableRole: "cell",
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
    },
  },
});

const cell = (value: string) =>
  schema.nodes.table_cell.create(null, schema.nodes.paragraph.create(null, schema.text(value)));
const row = (...values: string[]) => schema.nodes.table_row.create(null, values.map(cell));
const para = (value: string) => schema.nodes.paragraph.create(null, schema.text(value));

const doc = schema.nodes.doc.create(null, [
  para("上"),
  schema.nodes.table.create(null, [row("ab", "cd"), row("ef", "gh")]),
  para("下"),
]);

function textAt(value: string, index = 0): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const at = node.text.indexOf(value);
    if (at >= 0 && found < 0) found = pos + at + index;
  });
  return found;
}

function cellPos(value: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole === "cell" && node.textContent === value && found < 0) {
      found = pos;
    }
  });
  return found;
}

export default function run() {
  const checker = createChecker();
  const below = textAt("下");
  const onLastRow = textAt("ef", 1);
  const dragged = selectionBetweenPointer(doc, below, onLastRow);

  checker.check("从表下拖进末行，头停在该行光标处", dragged.head === onLastRow && dragged.anchor === below);
  checker.check("末行拖选仍是文字选区", dragged instanceof TextSelection);

  const covered = new Set(fullyCoveredCells(doc, dragged.from, dragged.to).map((item) => item.pos));
  checker.check("末行光标之后的格子被选中", covered.has(cellPos("gh")));
  checker.check("光标所在格子只按文字位置选，不整格铺满", !covered.has(cellPos("ef")));
  checker.check("指针还没到的上方行不会被选中", !covered.has(cellPos("ab")) && !covered.has(cellPos("cd")));

  const across = selectionBetweenPointer(doc, textAt("ab"), textAt("cd"));
  checker.check("表内跨格仍是单元格选区", across instanceof CellSelection);

  const started = performance.now();
  for (let i = 0; i < 200; i += 1) {
    const sel = selectionBetweenPointer(doc, below, onLastRow);
    fullyCoveredCells(doc, sel.from, sel.to);
  }
  const each = (performance.now() - started) / 200;
  checker.check("选区计算单次低于 10 毫秒", each < 10, `${each.toFixed(3)}ms`);

  const drag = readFileSync("src/components/editor/extensions/trailingBlankDrag.ts", "utf8");
  const view = readFileSync("src/components/editor/extensions/tableCellSelectionView.ts", "utf8");
  checker.check(
    "底部空白拖选直接跟指针，不再在表格边界停住",
    drag.includes("selectionBetweenPointer") && !drag.includes("isSpanningTableSelection"),
  );
  checker.check(
    "表外向上拖在进入行后不再整段扫描文档",
    view.includes("currentTablePos == null && !draggingDoc"),
  );
  return checker.failed;
}
