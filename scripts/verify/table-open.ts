/**
 * 富表格重新打开：本应用写出的 HTML 表格（新旧标记名）打开时不被 raw guard 包成 raw-block，
 * 原样写回磁盘；手写的普通 HTML 表格仍受保护。
 * 运行：node scripts/verify/run.mjs table-open
 */
import { serializeTable } from "@/lib/export/markdown/serialize/table";
import {
  decodeUnsupportedMarkdownForDisk,
  encodeUnsupportedMarkdownForEditor,
} from "@/lib/markdown-raw-guard";
import { createChecker } from "./lib/check";

const RAW = /thinkly-raw-block|thinkly:raw-block/;

export default function run() {
  const checker = createChecker();
  // 单元格里有 `_` 和链接，序列化器会写成 HTML 表格
  const table = serializeTable({
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: [[{ type: "text", text: "名称", styles: {} }], [{ type: "text", text: "令牌", styles: {} }]] },
        {
          cells: [
            [{ type: "link", href: "https://example.com/tokens", content: [{ type: "text", text: "npm", styles: {} }] }],
            [{ type: "text", text: "npm_abc_123", styles: {} }],
          ],
        },
      ],
    },
  });
  const markdown = `## 其他\n\n${table}\n\n结尾`;
  checker.check("带链接和下划线的表格写成本应用 HTML 表格", /^<table data-thinkly-table="v1"/.test(table), table.slice(0, 80));

  const encoded = encodeUnsupportedMarkdownForEditor(markdown);
  checker.check("打开时不包成 raw-block", !RAW.test(encoded), encoded.slice(0, 200));
  checker.check("打开时表格原样交给表格解析", encoded === markdown);
  checker.check("保存时原样写回磁盘", decodeUnsupportedMarkdownForDisk(encoded) === markdown);

  const legacy = table.replace('data-thinkly-table="v1"', 'data-goose-table="v1"');
  checker.check("旧版 goose 标记的表格同样不包成 raw-block", !RAW.test(encodeUnsupportedMarkdownForEditor(legacy)));

  const handwritten = "<table>\n<tr><td>a</td></tr>\n</table>";
  const guarded = encodeUnsupportedMarkdownForEditor(handwritten);
  checker.check(
    "手写 HTML 表格仍包成 raw-block 并原样写回",
    RAW.test(guarded) && decodeUnsupportedMarkdownForDisk(guarded) === handwritten,
  );

  return checker.failed;
}
