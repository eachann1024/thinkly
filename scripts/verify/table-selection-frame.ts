import { readFileSync } from "node:fs";
import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import {
  tableCellPaintsAnchorFrame,
  tableSelectionFrameClasses,
} from "@/components/editor/extensions/tableCellSelectionExtension";
import { createChecker } from "./lib/check";

const ANCHOR = "goose-table-selection-anchor";
const EDGES = ["top", "right", "bottom", "left"] as const;

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

const doc = schema.nodes.doc.create(null, [
  schema.nodes.table.create(null, [
    row("名称", "类型", "状态"),
    row("北区", "备件", "在库"),
    row("南区", "耗材", "在途"),
    row("东区", "样品", "展出"),
  ]),
]);

function cellPos(value: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole === "cell" && node.textContent === value && found < 0) found = pos;
  });
  return found;
}

function textPos(value: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text === value && found < 0) found = pos;
  });
  return found;
}

function classesFor(selection: EditorState["selection"]): string[] {
  return tableSelectionFrameClasses(EditorState.create({ doc, selection }));
}

function hasEdge(className: string, edge: (typeof EDGES)[number]): boolean {
  return className.split(/\s+/).includes(`goose-table-selection-${edge}`);
}

function paintsInsetFrame(className: string): boolean {
  return className.split(/\s+/).includes(ANCHOR) && EDGES.every((edge) => hasEdge(className, edge));
}

function cssRulePaintsInset(css: string, property: string): boolean {
  return css.split("}").some((block) => {
    if (!block.includes(`${property}:`)) return false;
    const selector = block.split("{")[0] ?? "";
    return selector.includes(ANCHOR) && EDGES.every((edge) => selector.includes(`goose-table-selection-${edge}`));
  });
}

export default function run() {
  const checker = createChecker();
  const multi = classesFor(CellSelection.create(doc, cellPos("北区"), cellPos("展出")));
  checker.check("多行选中覆盖三行九格", multi.length === 9, String(multi.length));
  checker.check(
    "多行选中不再给锚点格加内框",
    multi.every((className) => !className.split(/\s+/).includes(ANCHOR)),
    multi.find((className) => className.includes(ANCHOR)),
  );
  checker.check(
    "多行选中没有任何一格能匹配整圈内框",
    multi.every((className) => !paintsInsetFrame(className)),
  );
  checker.check(
    "多行选中仍描出外轮廓",
    multi.some((className) => hasEdge(className, "top") && hasEdge(className, "left")) &&
      multi.some((className) => hasEdge(className, "bottom") && hasEdge(className, "right")) &&
      multi.some((className) => hasEdge(className, "top") && hasEdge(className, "right")),
  );

  const oneRow = classesFor(CellSelection.create(doc, cellPos("北区"), cellPos("在库")));
  checker.check(
    "同一行的多格选中也不叠锚点内框",
    oneRow.length === 3 && oneRow.every((className) => !className.split(/\s+/).includes(ANCHOR)),
  );

  const single = classesFor(CellSelection.create(doc, cellPos("南区")));
  checker.check(
    "单格选中仍保留锚点框和外轮廓",
    single.length === 1 && paintsInsetFrame(single[0] ?? ""),
    single[0],
  );
  checker.check(
    "锚点内框只在起止是同一格时出现",
    tableCellPaintsAnchorFrame(cellPos("南区"), cellPos("南区")) &&
      !tableCellPaintsAnchorFrame(cellPos("北区"), cellPos("展出")),
  );

  const editing = textPos("南区");
  const text = classesFor(TextSelection.create(doc, editing + 1, editing + 2));
  checker.check("格内编辑不画单元格框", text.length === 0, text.join("|"));

  const css = readFileSync("src/pages/workspace/styles/editor-base/tables-callouts/table-surface.css", "utf8");
  checker.check(
    "样式里的锚点内框要求四边都是选区外沿",
    cssRulePaintsInset(css, "box-shadow") && cssRulePaintsInset(css, "outline"),
  );
  checker.check(
    "外轮廓描边还在",
    css.includes("goose-table-selection-top::after") && css.includes("border-top-width: 2px"),
  );

  return checker.failed;
}
