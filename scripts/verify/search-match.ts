import { readFileSync } from "node:fs";
import { resetIndex, searchIndex } from "../../src/pages/workspace/components/command/pageSearchIndex";
import { createChecker } from "./lib/check";
import { countLiteralMatches, looseMatchRanges, prepareSearchQuery, scanLiteral } from "../../src/pages/workspace/components/command/commandSearchText";
import { searchSplitPlacement } from "../../src/pages/workspace/components/search-sheet/searchSplitShortcut";

const key = (
  overrides: Partial<{ key: string; altKey: boolean; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; repeat: boolean }>,
) => ({
  key: "ArrowRight",
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  repeat: false,
  ...overrides,
});

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 正文匹配");
  check("汉字换行仍能命中", countLiteralMatches("今天的会议\n纪要已经写完", "会议纪要") === 1);
  check("汉字之间的空格仍能命中", looseMatchRanges("会议 纪要", "会议纪要").length === 1);
  check("英文换行折成一个空格", countLiteralMatches("hello\nworld", "hello world") === 1);
  check("英文不会收成连写", countLiteralMatches("helloworld", "hello world") === 0);
  const ranged = looseMatchRanges("前文\n会议\n纪要后文", "会议纪要");
  check("命中范围盖住换行两侧", ranged.length === 1 && ranged[0]?.start === 3 && ranged[0]?.end === 8);
  check("查询里的换行同样能对上", countLiteralMatches("会议纪要", "会议\n纪要") === 1);
  check("汉字逐字断开仍能命中", countLiteralMatches("会\n议\n纪\n要", "会议纪要") === 1);
  check("加号按字面匹配", countLiteralMatches("a+b", "a+b") === 1 && countLiteralMatches("axb", "a+b") === 0);
  check("英文大小写都能命中", countLiteralMatches("Hello\nWorld", "hello world") === 1);
  resetIndex();
  check("索引没建好时返回空，不让整次搜索中断", searchIndex("会议纪要", { pagesRef: null, notebooksRef: null, sortedByTitle: [], pageIdsWithChildren: new Set() }) === null);
  const searchSource = readFileSync("src/pages/workspace/components/command/cooperativeCommandSearch.ts", "utf8");
  check("空索引仍继续扫正文", searchSource.includes("searchIndex(query, catalog) ?? []"));
  const css = readFileSync("src/pages/workspace/components/search-sheet/search-sheet.css", "utf8");
  const kbd = css.match(/\.search-sheet-kbd \{[^}]+\}/)?.[0] ?? "";
  const footerItem = css.match(/\.search-sheet-footer span \{[^}]+\}/)?.[0] ?? "";
  check("快捷键胶囊固定高度并单行居中", kbd.includes("height:1.25rem") && kbd.includes("align-items:center") && kbd.includes("white-space:nowrap"));
  check("页脚提示行固定高度并垂直居中", footerItem.includes("height:2.25rem") && footerItem.includes("align-items:center"));

  console.log("· 匹配耗时");
  const prepared = prepareSearchQuery("会议纪要");
  const unit = "今天的会议\n纪要已经写完。hello world ";
  const miss = "这是一段没有目标词的普通笔记内容，记录日常。hello world ";
  const fill = (n: number, len: number, hitEvery: number) => {
    const hitBody = unit.repeat(Math.ceil(len / unit.length)).slice(0, len);
    const missBody = miss.repeat(Math.ceil(len / miss.length)).slice(0, len);
    return Array.from({ length: n }, (_, index) => (index % hitEvery === 0 ? hitBody : missBody));
  };
  const time = (run: () => void) => {
    const samples = [0, 1, 2].map(() => {
      const started = performance.now();
      run();
      return performance.now() - started;
    });
    samples.sort((a, b) => a - b);
    return samples[1]!;
  };
  const corpus = fill(100_000, 200, 17);
  const looseMs = time(() => {
    for (const text of corpus) scanLiteral(text, prepared);
  });
  const needle = "会议纪要";
  const oldMs = time(() => {
    for (const text of corpus) {
      const hay = text.toLowerCase();
      let index = 0;
      while ((index = hay.indexOf(needle, index)) !== -1) index += needle.length;
    }
  });
  check("十万条宽松匹配不超过 50 毫秒", looseMs <= 50, { looseMs, oldMs });
  check("宽松匹配不超过改前 indexOf 的 10%", looseMs <= oldMs * 1.1, { looseMs, oldMs });
  const million = fill(1_000_000, 80, 1000);
  const millionMs = time(() => {
    for (const text of million) scanLiteral(text, prepared);
  });
  check("百万条里偶尔命中也不超过 50 毫秒", millionMs <= 50, { millionMs });

  console.log("· 分屏方向");
  check("macOS ⌘→ 向右", searchSplitPlacement(key({ metaKey: true }), "mac") === "right");
  check("macOS 不把 Ctrl→ 当成分屏", searchSplitPlacement(key({ ctrlKey: true }), "mac") === null);
  check("Windows Ctrl↓ 向下", searchSplitPlacement(key({ key: "ArrowDown", ctrlKey: true }), "windows") === "bottom");
  check("Windows 不把 Win↓ 当成分屏", searchSplitPlacement(key({ key: "ArrowDown", metaKey: true }), "windows") === null);
  check("Linux Ctrl← 向左", searchSplitPlacement(key({ key: "ArrowLeft", ctrlKey: true }), "linux") === "left");
  check("Linux Ctrl↑ 向上", searchSplitPlacement(key({ key: "ArrowUp", ctrlKey: true }), "linux") === "top");
  check("按住 Shift 不分屏", searchSplitPlacement(key({ metaKey: true, shiftKey: true }), "mac") === null);

  return checker.failed;
}
