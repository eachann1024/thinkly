/**
 * 新保存的笔记用普通 Markdown：空段是空行，嵌套列表是缩进，图片是 ![]()。
 * 旧注释和自定义属性仍能打开。运行：node scripts/verify/run.mjs plain-markdown
 */
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { encodeLocalBlockPropsWrappers } from "@/lib/export/markdown/localBlockPropsWrappers";
import { createChecker } from "./lib/check";

const text = (value: string) => [{ type: "text", text: value, styles: {} }];
const plain = (block: any): string => {
  const content = block?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part: any) => (typeof part === "string" ? part : part?.text ?? "")).join("");
};
const local = (blocks: any[]) =>
  jsonContentToMarkdown(encodeLocalBlockPropsWrappers(blocks as any, { preserveEmptyParagraphs: true }));

export default async function run(): Promise<number> {
  const checker = createChecker();
  const check = checker.check;

  const saved = local([{ type: "paragraph" }, { type: "paragraph", content: text("正文") }]);
  const opened = markdownToJsonContent(saved);
  check("空段保存没有空段注释", !/empty-block/.test(saved), saved);
  check("空段重开仍是空段加正文", opened[0]?.type === "paragraph" && plain(opened[0]) === "" && plain(opened[1]) === "正文", opened);

  const legacyEmpty = markdownToJsonContent("<!-- goose-note:empty-block=paragraph -->\n\n正文\n");
  check("旧空段注释仍能打开", legacyEmpty[0]?.type === "paragraph" && plain(legacyEmpty[0]) === "" && plain(legacyEmpty[1]) === "正文", legacyEmpty);

  const nested = [{
    type: "numberedListItem",
    content: text("形体向："),
    children: ["二头弯举", "上头金后", "三头颈后臂屈伸", "悬垂举腿"].map((line) => ({
      type: "numberedListItem",
      content: text(line),
    })),
  }];
  const listMd = jsonContentToMarkdown(nested as any);
  const listBack = markdownToJsonContent(listMd);
  check("嵌套列表用缩进而不是 br", /\n +1\. 二头弯举/.test(listMd) && !listMd.includes("<br>"), listMd);
  check("嵌套列表重开四个子项",
    (listBack[0]?.children ?? []).map(plain).join("|") === "二头弯举|上头金后|三头颈后臂屈伸|悬垂举腿",
    listBack);

  const lifted = markdownToJsonContent("6. 形体向：<br>1. 二头弯举<br>2. 上头金后<br>3. 三头颈后臂屈伸<br>4. 悬垂举腿\n");
  check("旧 br 子列表拆回嵌套",
    plain(lifted[0]) === "形体向：" && (lifted[0]?.children ?? []).map(plain).join("|") === "二头弯举|上头金后|三头颈后臂屈伸|悬垂举腿",
    lifted);

  const image = jsonContentToMarkdown([{
    type: "image",
    props: { url: "/assets/asset_8c2881a4-8f67-4f78-86a1-46753f3d0b29.png", name: "image.png", caption: "" },
  }] as any);
  const imageBack = markdownToJsonContent(image);
  check("图片是标准语法", /^!\[[^\]]*\]\(\/assets\/asset_8c2881a4-8f67-4f78-86a1-46753f3d0b29\.png\)$/.test(image.trim()) && !image.includes("goose-image"), image);
  check("图片地址还在且不把文件名当成说明",
    imageBack[0]?.props?.url?.includes("asset_8c2881a4") && !imageBack[0]?.props?.caption,
    imageBack[0]?.props);

  const encoded = encodeURIComponent(JSON.stringify({ v: 1, caption: "说明", name: "image.png", alt: "image.png", showPreview: true }));
  const oldImage = markdownToJsonContent(`![image.png](/assets/a.png){goose-image=${encoded}}\n`);
  check("旧图片属性还能读", oldImage[0]?.props?.url === "/assets/a.png" && oldImage[0]?.props?.caption === "说明", oldImage[0]?.props);

  const columns = jsonContentToMarkdown([{
    type: "columnLayout",
    props: { widths: "60,40" },
    children: [
      { type: "columnSection", children: [{ type: "paragraph", content: text("左") }] },
      { type: "columnSection", children: [{ type: "paragraph", content: text("右") }] },
    ],
  }] as any);
  const columnsBack = markdownToJsonContent(columns);
  check("分栏不写注释", !/<!--\s*(?:thinkly|goose-note):columns\b/i.test(columns), columns);
  check("分栏重开", columnsBack[0]?.type === "columnLayout" && columnsBack[0]?.props?.widths === "60,40" && plain(columnsBack[0]?.children?.[1]?.children?.[0]) === "右");

  const callout = jsonContentToMarkdown([{ type: "callout", props: { icon: "Lightbulb" }, content: text("注意") }] as any);
  check("标注不写图标注释", !/callout-icon/.test(callout), callout);
  check("标注正文还在", plain(markdownToJsonContent(callout)[0]) === "注意");

  const colored = jsonContentToMarkdown([{ type: "paragraph", props: { textColor: "red" }, content: text("红字") }] as any);
  check("文字颜色不写进正文注释", !/block-props|<!--/.test(colored), colored);
  check("文字颜色从文件头读回", markdownToJsonContent(colored)[0]?.props?.textColor === "red", colored);

  const table = jsonContentToMarkdown([{
    type: "table",
    props: { sequenceColumn: true },
    content: { type: "tableContent", headerRows: 1, rows: [{ cells: ["序", "项"] }, { cells: ["2", "B"] }] },
  }] as any);
  check("表格序号不写注释", !/table-sequence/.test(table), table);
  check("表格序号重开", markdownToJsonContent(table)[0]?.props?.sequenceColumn === true);
  const oldTable = markdownToJsonContent("<!-- thinkly:table-sequence -->\n| 序 | 项 |\n| --- | --- |\n| 2 | B |\n");
  check("旧表格序号注释仍能打开", oldTable[0]?.props?.sequenceColumn === true && JSON.stringify(oldTable).includes("2"));

  const file = jsonContentToMarkdown([{ type: "file", props: { url: "/a.pdf", name: "a.pdf", caption: "附件" } }] as any);
  check("附件不写 goose-file", !file.includes("goose-file") && file.includes("[📎 a.pdf](/a.pdf)"), file);
  check("附件说明重开", markdownToJsonContent(file)[0]?.props?.caption === "附件");
  const oldFile = markdownToJsonContent(`[📎 a.pdf](/a.pdf){goose-file=${encodeURIComponent(JSON.stringify({ v: 1, caption: "旧附件" }))}}\n`);
  check("旧附件属性还能读", oldFile[0]?.props?.caption === "旧附件" && oldFile[0]?.props?.url === "/a.pdf");

  const code = jsonContentToMarkdown([{
    type: "codeBlock",
    props: { language: "ts", summary: "摘要", collapsed: true },
    content: "const a = 1;",
  }] as any);
  const codeBack = markdownToJsonContent(code);
  check("代码围栏不写 thinkly 属性", !/thinkly=|goose-note=/.test(code), code);
  check("代码摘要重开", codeBack[0]?.props?.summary === "摘要" && codeBack[0]?.props?.collapsed === true && codeBack[0]?.content === "const a = 1;");

  check("不保留的空段不写在标题前", jsonContentToMarkdown([{ type: "paragraph" }, { type: "heading", props: { level: 2 }, content: "正文" }] as any) === "## 正文");
  check("单个空段保存为空", jsonContentToMarkdown([{ type: "paragraph" }] as any) === "");

  return checker.failed;
}
