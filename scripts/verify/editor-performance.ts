import { BlockNoteEditor, blockToNode } from "@blocknote/core";
import { blockToEditorNode } from "@/components/editor/core/fastBlockToNode";
import {
  initialRowWindow,
  liveRowCount,
  rowIsLive,
  rowWindowAround,
  shouldAnimateBlockRemoval,
  tableUsesWindow,
} from "@/components/editor/extensions/tableWindowModel";
import { createChecker } from "./lib/check";

export default function run() {
  const checker = createChecker();
  const rows = 5000;
  const window = rowWindowAround(rows, 2500, [10, 4900]);
  const live = liveRowCount(rows, window, false);
  checker.check("5000 行只挂视口和选区两端", live < 120 && live > 40, live);
  checker.check("中间行保持空壳", !rowIsLive(1000, rows, window, false));
  checker.check("视口行是活的", rowIsLive(window.start + 2, rows, window, false));
  checker.check("选区行是活的", rowIsLive(4900, rows, window, false));
  checker.check("小表不窗口化", !tableUsesWindow(2, false) && !tableUsesWindow(63, false));
  checker.check("合并单元格不窗口化", !tableUsesWindow(200, true));
  checker.check("初始窗口盖住开头", rowIsLive(0, rows, initialRowWindow(rows), false));
  checker.check("整页替换不截图", !shouldAnimateBlockRemoval({
    docChanged: true, history: false, stepCount: 1, removed: 80, inserted: 0, rootBlocks: 3,
  }));
  checker.check("长文档删除不截图", !shouldAnimateBlockRemoval({
    docChanged: true, history: true, stepCount: 1, removed: 6, inserted: 0, rootBlocks: 80,
  }));
  checker.check("大段删除不截图", !shouldAnimateBlockRemoval({
    docChanged: true, history: true, stepCount: 1, removed: 400, inserted: 0, rootBlocks: 4,
  }));
  checker.check("短文档删一块会过渡", shouldAnimateBlockRemoval({
    docChanged: true, history: true, stepCount: 1, removed: 8, inserted: 0, rootBlocks: 6,
  }));
  const schema = BlockNoteEditor.create().pmSchema;
  const sample = {
    type: "table",
    id: "t1",
    props: { textColor: "red" },
    content: {
      type: "tableContent",
      headerRows: 1,
      columnWidths: [120, undefined, 80],
      rows: [
        { cells: ["a", { type: "tableCell", props: { backgroundColor: "blue" }, content: "b" }, ""] },
        { cells: ["c", "d", "e"] },
      ],
    },
  };
  const same = JSON.stringify(blockToEditorNode(sample as never, schema).toJSON())
    === JSON.stringify(blockToNode(sample as never, schema).toJSON());
  checker.check("小表结构和原来一致", same);
  const big = {
    type: "table",
    id: "big",
    content: {
      type: "tableContent",
      rows: Array.from({ length: 1500 }, (_, row) => ({
        cells: [`${row}-0`, `${row}-1`, `${row}-2`, `${row}-3`],
      })),
    },
  };
  const started = performance.now();
  const built = blockToEditorNode(big as never, schema);
  const elapsed = Math.round(performance.now() - started);
  checker.check("1500 行表格直接建成", built.firstChild?.childCount === 1500 && elapsed < 80, elapsed);
  const scanStarted = performance.now();
  for (let i = 0; i < 30; i += 1) liveRowCount(rows, window, false);
  checker.check("行窗口判定足够快", performance.now() - scanStarted < 80);
  return checker.failed;
}
