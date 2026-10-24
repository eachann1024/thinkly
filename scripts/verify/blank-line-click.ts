import {
  extendToVisualLineEnd,
  extendToVisualLineStart,
  resolveBlockEmptyClickPos,
  type CaretCoords,
} from "../../src/components/editor/extensions/trailingBlankClickGeometry";
import { createChecker } from "./lib/check";

// 给定排版坐标验证行定位；真实 Chromium 的硬换行坐标另用隔离编辑器验收。
const caret = (top: number, left: number): CaretCoords => ({
  top, bottom: top + 18, left, right: left,
});

export default function run() {
  const checker = createChecker();
  const runLines = (label: string, positions: CaretCoords[], ends: number[]) => {
    const coordsAtPos = (pos: number) => positions[pos];
    const end = positions.length - 1;
    let start = 0;
    for (const lineEnd of ends) {
      const { top, left } = positions[lineEnd];
      const click = resolveBlockEmptyClickPos({
        clientX: left + 80, clientY: top + 9, start: 0, end, coordsAtPos,
      });
      checker.check(`${label}：第 ${ends.indexOf(lineEnd) + 1} 行点击停在本行`, click === lineEnd, click);
      checker.check(`${label}：本行首尾扫描不跨行`,
        extendToVisualLineEnd(coordsAtPos, start, end) === lineEnd &&
        extendToVisualLineStart(coordsAtPos, lineEnd, 0) === start);
      start = lineEnd + 1;
    }
  };

  runLines("正文后连续空行", [
    caret(0, 20), caret(0, 36), caret(0, 52),
    caret(28, 20), caret(56, 20), caret(84, 20),
  ], [2, 3, 4, 5]);
  runLines("两段文字之间的连续空行", [
    caret(0, 20), caret(0, 36), caret(28, 20), caret(56, 20),
    caret(84, 20), caret(84, 36),
  ], [1, 2, 3, 5]);
  runLines("居中/右对齐后短行向右起笔", [
    caret(0, 20), caret(0, 36), caret(28, 100), caret(28, 116),
    caret(56, 160), caret(84, 160),
  ], [1, 3, 4, 5]);
  runLines("自然折行", [
    caret(0, 20), caret(0, 36), caret(0, 52),
    caret(28, 20), caret(28, 36),
  ], [2, 4]);

  const positions = [caret(0, 20), caret(0, 36), caret(28, 20), caret(56, 20)];
  const resolve = (clientX: number, clientY: number) => resolveBlockEmptyClickPos({
    clientX, clientY, start: 0, end: 3, coordsAtPos: (pos) => positions[pos],
  });
  checker.check("文字内部点击留给原生定位", resolve(25, 9) === null);
  checker.check("行高缝隙选择最近空行", resolve(100, 49) === 2);
  checker.check("整块下方仍可落到块末尾", resolve(100, 100) === 3);
  checker.check("整块上方只落到首行行尾", resolve(100, -10) === 1);
  checker.check("独立空段落仍可定位", resolveBlockEmptyClickPos({
    clientX: 100, clientY: 9, start: 0, end: 0, coordsAtPos: () => caret(0, 20),
  }) === 0);
  const sameLine = [caret(0, 20), caret(-2, 36), caret(0, 52)];
  checker.check("同一行字体高度变化不误判换行",
    extendToVisualLineEnd((pos) => sameLine[pos], 0, 2) === 2);
  return checker.failed;
}
