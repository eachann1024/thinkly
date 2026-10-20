/**
 * 表格序号默认不改写。右键打开「自动追加编号」后，勾选时补齐，之后只在行数变化时追加。
 * 运行：node scripts/verify/run.mjs table-sequence
 */
import { readFileSync } from "node:fs";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { serializeTable } from "@/lib/export/markdown/serialize/table";
import {
  sequenceColumnTransaction,
  toggleTableSequenceTransaction,
} from "@/components/editor/extensions/tableSequenceExtension";
import { createChecker } from "./lib/check";

const schema = new Schema({
  nodes: {
    doc: { content: "blockContainer" },
    blockContainer: {
      content: "table",
      attrs: { id: { default: null } },
    },
    text: { group: "inline" },
    table: {
      content: "tableRow+",
      tableRole: "table",
      attrs: { sequenceColumn: { default: false } },
    },
    tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
    tableHeader: {
      content: "tableParagraph+",
      tableRole: "header_cell",
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 } },
    },
    tableCell: {
      content: "tableParagraph+",
      tableRole: "cell",
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 } },
    },
    tableParagraph: { content: "inline*" },
  },
});

function paragraph(text: string) {
  return schema.nodes.tableParagraph.create(null, text ? schema.text(text) : null);
}

function cell(text: string, header = false) {
  const type = header ? schema.nodes.tableHeader : schema.nodes.tableCell;
  return type.create(null, paragraph(text));
}

function document(rows: string[][], enabled = false, header = "序") {
  const lines = [
    schema.nodes.tableRow.create(null, [cell(header, true), cell("优先级", true)]),
    ...rows.map((values) => schema.nodes.tableRow.create(null, values.map((value) => cell(value)))),
  ];
  const table = schema.nodes.table.create({ sequenceColumn: enabled }, lines);
  return schema.nodes.doc.create(null, schema.nodes.blockContainer.create({ id: "table-1" }, table));
}

function open(rows: string[][], enabled = false, header = "序") {
  return EditorState.create({ doc: document(rows, enabled, header) });
}

function firstColumn(state: EditorState): string[] {
  const tableNode = state.doc.firstChild!.firstChild!;
  const values: string[] = [];
  tableNode.forEach((row, _offset, index) => {
    if (index === 0) return;
    values.push(row.firstChild?.textContent ?? "");
  });
  return values;
}

function columnAfter(state: EditorState, previous?: EditorState) {
  const tr = sequenceColumnTransaction(state, previous);
  return firstColumn(tr ? state.apply(tr) : state);
}

const sample = [
  ["1", "A"],
  ["2", "A"],
  ["2", "B"],
  ["3", "C"],
  ["", "合计"],
];

export default function run() {
  const checker = createChecker();
  checker.check(
    "未开启时不改序号",
    columnAfter(open(sample)).join(",") === "1,2,2,3,",
  );

  checker.check(
    "勾选后重复号和空序号补成 1 到 5",
    columnAfter(open(sample, true)).join(",") === "1,2,3,4,5",
  );

  const already = open([["1", "A"], ["2", "B"]], true);
  checker.check("已经连续时不再改文档", sequenceColumnTransaction(already) === null);

  const dirty = open([["1", "A"], ["9", "B"]], true);
  const sameRows = open([["1", "A"], ["2", "B"]], true);
  checker.check(
    "开启后普通修改不改序号",
    sequenceColumnTransaction(dirty, sameRows) === null,
  );

  const added = open([["1", "A"], ["2", "B"], ["", "C"]], true);
  checker.check(
    "开启后新增一行才追加编号",
    columnAfter(added, already).join(",") === "1,2,3",
  );

  checker.check(
    "文字单元格保留，空序号往后排",
    columnAfter(open([["1", "A"], ["合计", "B"], ["", "C"]], true)).join(",") === "1,合计,2",
  );

  const spanned = schema.nodes.table.create({ sequenceColumn: true }, [
    schema.nodes.tableRow.create(null, [cell("序", true), cell("优先级", true)]),
    schema.nodes.tableRow.create(null, [
      schema.nodes.tableCell.create({ colspan: 2 }, paragraph("1")),
    ]),
  ]);
  const spannedState = EditorState.create({
    doc: schema.nodes.doc.create(null, schema.nodes.blockContainer.create({ id: "table-1" }, spanned)),
  });
  checker.check("有合并单元格的表不重排", sequenceColumnTransaction(spannedState) === null);

  const toggled = toggleTableSequenceTransaction(open(sample), "table-1");
  const enabled = toggled ? open(sample).apply(toggled) : open(sample);
  checker.check(
    "右键勾选时写入编号并记住选择",
    Boolean(toggled) &&
      firstColumn(enabled).join(",") === "1,2,3,4,5" &&
      enabled.doc.firstChild!.firstChild!.attrs.sequenceColumn === true,
  );

  const turnedOff = toggleTableSequenceTransaction(already, "table-1");
  const disabled = turnedOff ? already.apply(turnedOff) : already;
  checker.check(
    "取消勾选后保留已有序号",
    Boolean(turnedOff) &&
      firstColumn(disabled).join(",") === "1,2" &&
      disabled.doc.firstChild!.firstChild!.attrs.sequenceColumn === false,
  );

  const markdown = serializeTable({
    type: "table",
    props: { sequenceColumn: true },
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: ["序", "优先级"] },
        { cells: ["1", "A"] },
        { cells: ["2", "B"] },
      ],
    },
  });
  const parsed = markdownToJsonContent(markdown);
  checker.check(
    "勾选结果会写进笔记并在重新打开时保留",
    markdown.startsWith("<!-- thinkly:table-sequence -->") &&
      markdown.includes("| 2 |") &&
      parsed[0]?.props?.sequenceColumn === true,
  );
  const plain = serializeTable({
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [{ cells: ["序", "优先级"] }, { cells: ["1", "A"] }],
    },
  });
  checker.check("未勾选时仍是普通表格", !plain.includes("table-sequence"));

  const columnMenu = readFileSync("src/components/editor/menus/GooseTableHandle.tsx", "utf8");
  checker.check(
    "列菜单里可以选择自动追加编号",
    columnMenu.includes("orderedNumbers") && columnMenu.includes("toggleTableSequence"),
  );

  return checker.failed;
}
