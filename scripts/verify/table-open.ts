import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { parseTableHtmlBlock } from "@/lib/export/markdown/parse/table";
import { serializeTable } from "@/lib/export/markdown/serialize/table";
import {
  decodeUnsupportedMarkdownForDisk,
  encodeUnsupportedMarkdownForEditor,
} from "@/lib/markdown-raw-guard";
import { createChecker } from "./lib/check";
import { installHtmlDom } from "./lib/html-dom";

const RAW = /thinkly-raw-block|thinkly:raw-block/;

export default function run() {
  const checker = createChecker();
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

  installHtmlDom();
  const blocks = markdownToJsonContent(planNote());
  const tables = blocks.filter((block: { type?: string }) => block.type === "table");
  const rawBlocks = blocks.filter((block: { type?: string; props?: { language?: string } }) =>
    block.type === "codeBlock" && block.props?.language === "thinkly-raw-block");
  checker.check("三张带链接的表都解析成表格", tables.length === 3 && rawBlocks.length === 0, JSON.stringify(blocks.map((block: { type?: string }) => block.type)));
  const expectedLinks = [
    ["https://www.bilibili.com/video/BV1rheP6TECb/?t=34", "引体向上"],
    ["https://www.bilibili.com/video/BV1rheP6TECb/?t=181", "上斜卧推"],
    ["https://www.bilibili.com/video/BV1rheP6TECb/?t=446", "哑铃硬拉"],
  ];
  tables.forEach((block: unknown, index: number) => {
    const links = linksOf(block);
    const [href, text] = expectedLinks[index];
    checker.check(`第 ${index + 1} 张表有可点链接`, links.some((link) => link.href === href && link.text === text), JSON.stringify(links));
    checker.check(`第 ${index + 1} 张表序列化后再解析不变`, same(parseTable(serializeTable(block)), block));
  });
  const text = JSON.stringify(blocks);
  checker.check("表外标题、加粗和普通链接仍在", text.includes("A 套餐") && text.includes("B 套餐") && text.includes("怎么排") && text.includes("https://www.bilibili.com/video/BV1rheP6TECb/"));
  checker.check("单元格里的 &gt; 解析成 >", text.includes("a > b"));
  checker.check("第一张表保留列宽", tables[0]?.content?.columnWidths?.[0] === 137);

  const marks = {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 0,
      headerCols: 0,
      rows: [{ cells: [{
        type: "tableCell",
        props: { colspan: 1, rowspan: 1 },
        content: [{
          type: "link",
          href: "https://example.com/a?x=1&y=2",
          content: [
            { type: "text", text: "粗", styles: { bold: true } },
            { type: "text", text: "斜", styles: { italic: true } },
            { type: "text", text: "码", styles: { code: true } },
            { type: "text", text: "删", styles: { strike: true } },
            { type: "text", text: "下", styles: { underline: true } },
            { type: "text", text: "组", styles: { bold: true, italic: true, code: true } },
            { type: "text", text: "\n", styles: {} },
            { type: "text", text: "a&b", styles: {} },
          ],
        }],
      }] }],
    },
  };
  checker.check("编辑器里的链接和行内标记往返一致", same(parseTable(serializeTable(marks)), marks));

  const alias = parseTable(`<table data-thinkly-table="v1" data-header-rows="0" data-header-cols="0">
<tbody>
<tr><td colspan="1" rowspan="1"><b><i><s><u><code>x</code></u></s></i></b><br><a href="mailto:a@b.c" target="_blank" rel="noopener noreferrer"><strong><em>邮</em></strong></a><a href="./note.md">相对</a></td></tr>
</tbody>
</table>`);
  const aliasLinks = linksOf(alias);
  const styled = textsOf(alias);
  checker.check(
    "b/i/s/u/code/br 与 mailto、相对链接能解析",
    alias?.type === "table" &&
      styled.some((item) => item.text === "x" && item.styles.bold && item.styles.italic && item.styles.strike && item.styles.underline && item.styles.code) &&
      styled.some((item) => item.text === "\n") &&
      aliasLinks.some((link) => link.href === "mailto:a@b.c" && link.text === "邮") &&
      aliasLinks.some((link) => link.href === "./note.md" && link.text === "相对"),
    JSON.stringify({ aliasLinks, styled }),
  );
  checker.check("别名标记序列化后再解析不变", same(parseTable(serializeTable(alias)), alias));

  const gooseLink = parseTable(tableHtml(["名称"], [[link("https://example.com/goose", "旧标记")]]).replaceAll("data-thinkly-", "data-goose-"));
  checker.check("旧版 goose 标记里的链接同样解析", gooseLink?.type === "table" && linksOf(gooseLink).some((item) => item.href === "https://example.com/goose" && item.text === "旧标记"));

  for (const [label, html] of [
    ["javascript: 链接整表回退", danger(`<a href="javascript:alert(1)" target="_blank" rel="noopener noreferrer">x</a>`)],
    ["实体编码的 javascript: 整表回退", danger(`<a href="&#106;avascript:alert(1)">x</a>`)],
    ["协议名里夹换行的 javascript: 整表回退", danger(`<a href="java&#10;script:alert(1)">x</a>`)],
    ["data: 链接整表回退", danger(`<a href="data:text/html,hi">x</a>`)],
    ["带 onclick 的链接整表回退", danger(`<a href="https://example.com" onclick="alert(1)">x</a>`)],
    ["单元格里的 div 整表回退", danger(`<div>x</div>`)],
  ] as const) {
    const block = parseTable(html);
    checker.check(label, block?.type === "codeBlock" && block.props?.language === "thinkly-raw-block" && !linksOf(block).length, block?.type);
  }

  const stripped = serializeTable({
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 0,
      rows: [{ cells: [[{ type: "link", href: "javascript:alert(1)", content: [{ type: "text", text: "点我", styles: {} }] }]] }],
    },
  });
  checker.check("保存时不写出 javascript 链接", !/javascript:/i.test(stripped) && stripped.includes("点我"), stripped);

  return checker.failed;
}

function cell(tag: "td" | "th", html: string) {
  return `<${tag} colspan="1" rowspan="1" data-thinkly-text-alignment="left" style="text-align:left">${html}</${tag}>`;
}

function link(href: string, text: string) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

function tableHtml(headers: string[], rows: string[][], width = "137px") {
  const colgroup = `<colgroup><col style="width:${width}">${"<col>".repeat(Math.max(0, headers.length - 1))}</colgroup>`;
  const head = `<tr>${headers.map((item) => cell("th", item)).join("")}</tr>`;
  const body = rows.map((row) => `<tr>${row.map((item) => cell("td", item)).join("")}</tr>`).join("\n");
  return `<table data-thinkly-table="v1" data-header-rows="1" data-header-cols="0">\n${colgroup}\n<tbody>\n${head}\n${body}\n</tbody>\n</table>`;
}

function planNote() {
  const video = (seconds: string) => `https://www.bilibili.com/video/BV1rheP6TECb/?t=${seconds}`;
  return [
    tableHtml(["项目", "作用"], [[link(video("34"), "引体向上"), "a &gt; b"]]),
    "",
    "## A 套餐",
    "",
    tableHtml(["顺序", "动作"], [["1", link(video("181"), "上斜卧推")]], "90px"),
    "",
    "## B 套餐",
    "",
    tableHtml(["顺序", "动作"], [["3", link(video("446"), "哑铃硬拉")]], "90px"),
    "",
    "**怎么排**：每周 2 练",
    "",
    "[完整视频](https://www.bilibili.com/video/BV1rheP6TECb/)",
  ].join("\n");
}

function danger(inner: string) {
  return `<table data-thinkly-table="v1" data-header-rows="0" data-header-cols="0">\n<tbody>\n<tr><td colspan="1" rowspan="1">${inner}</td></tr>\n</tbody>\n</table>`;
}

function parseTable(html: string) {
  return parseTableHtmlBlock(html.split("\n"), 0)?.block;
}

function walk(value: unknown, visit: (node: Record<string, any>) => void) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === "object") {
    visit(value as Record<string, any>);
    for (const child of Object.values(value as Record<string, unknown>)) walk(child, visit);
  }
}

function linksOf(value: unknown) {
  const links: { href: string; text: string }[] = [];
  walk(value, (node) => {
    if (node.type !== "link") return;
    const text = Array.isArray(node.content) ? node.content.map((item: { text?: string }) => item.text || "").join("") : "";
    links.push({ href: String(node.href || ""), text });
  });
  return links;
}

function textsOf(value: unknown) {
  const texts: { text: string; styles: Record<string, unknown> }[] = [];
  walk(value, (node) => {
    if (node.type === "text" && typeof node.text === "string") texts.push({ text: node.text, styles: node.styles || {} });
  });
  return texts;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value as object).sort().flatMap((key) => {
    const item = (value as Record<string, unknown>)[key];
    return item === undefined ? [] : [[key, stable(item)]];
  }));
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}
