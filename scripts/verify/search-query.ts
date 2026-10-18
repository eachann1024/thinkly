import { createChecker } from "./lib/check";
import { collapseComposerSearchText, composerDocFromPlainText } from "../../src/pages/workspace/components/search-sheet/searchQueryText";

/** 搜索输入：换行折成检索词，种回输入框时保留分段。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  check("换行和空行折成一个空格", collapseComposerSearchText("会议\n\n纪要") === "会议 纪要");
  check("零宽字符不进检索词", collapseComposerSearchText("a\u200Bb") === "ab" && collapseComposerSearchText("  ") === "");
  const doc = composerDocFromPlainText("第一行\n第二行");
  const lines = doc?.content ?? [];
  check("换行种成两段", doc?.type === "doc" && lines.length === 2 && lines[0]?.content?.[0]?.text === "第一行" && lines[1]?.content?.[0]?.text === "第二行");
  check("空查询不种文档", composerDocFromPlainText("") === null);
  return checker.failed;
}
