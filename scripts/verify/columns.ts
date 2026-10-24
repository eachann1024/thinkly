/**
 * 分栏块验收：覆盖保存读取、粘贴、AI 插入与摘要、分享图片、Word、PDF 备用通道。
 * 运行：node scripts/verify/run.mjs columns
 */
import { strFromU8, unzipSync } from "fflate";
import { Document, Packer } from "docx";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { importMarkdownFragment } from "@/lib/export/markdown/parse";
import { parseAiMarkdownToBlocks } from "@/lib/notebook-ai/markdown";
import { extractStructureSummary } from "@/components/editor/utils/content-text-extractor";
import { renderBlocks } from "@/lib/imageExport/serializer/renderer";
import { NOTEBOOK_THEME } from "@/lib/imageExport/themes";
import { processBlockChildren } from "@/lib/docxExport/docxBlocks";
import { createPdfDocument } from "@/lib/pdfExport/renderer";
import { plainHasGooseColumnMarkers } from "@/components/editor/hooks/editorPasteBlocks";
import { createChecker } from "./lib/check";

const text = (value: string) => [{ type: "text", text: value, styles: {} }];
const SAMPLE: any[] = [
  { type: "heading", props: { level: 1 }, content: text("分栏验收") },
  {
    type: "columnLayout",
    props: { widths: "60,40" },
    children: [
      { type: "columnSection", children: [
        { type: "heading", props: { level: 2 }, content: text("左栏标题") },
        { type: "paragraph", content: text("左栏正文 LEFT") },
      ] },
      { type: "columnSection", children: [
        { type: "paragraph", content: text("右栏正文 RIGHT") },
      ] },
    ],
  },
  { type: "paragraph", content: text("分栏之后") },
];

const findLayout = (blocks: any[] | null | undefined): any =>
  (blocks ?? []).find((block) => block?.type === "columnLayout");

function layoutShape(layout: any) {
  return {
    widths: layout?.props?.widths,
    sections: (layout?.children ?? []).map((section: any) =>
      (section.children ?? []).map((child: any) => {
        if (typeof child.content === "string") return child.content;
        const first = child.content?.[0];
        return typeof first === "string" ? first : first?.text ?? child.type;
      })),
  };
}

function walk(node: any, visit: (node: any) => void) {
  if (!node || typeof node !== "object") return;
  visit(node);
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) walk(child, visit);
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const check = checker.check;
  const expected = layoutShape(SAMPLE[1]);

  // 1. 保存成 .md 再读回
  const markdown = jsonContentToMarkdown(SAMPLE as any);
  check("保存：正文不再写分栏注释", !/<!--\s*(?:thinkly|goose-note):columns\b/i.test(markdown), markdown);
  const reread = importMarkdownFragment(markdown);
  check("读取：栏宽与每栏内容原样还原",
    JSON.stringify(layoutShape(findLayout(reread as any[]))) === JSON.stringify(expected),
    layoutShape(findLayout(reread as any[])));
  const legacy = importMarkdownFragment([
    "# 分栏验收",
    "",
    "<!-- goose-note:columns widths=\"60,40\" -->",
    "<!-- goose-note:column -->",
    "## 左栏标题",
    "",
    "左栏正文 LEFT",
    "<!-- /goose-note:column -->",
    "<!-- goose-note:column -->",
    "右栏正文 RIGHT",
    "<!-- /goose-note:column -->",
    "<!-- /goose-note:columns -->",
    "",
    "分栏之后",
  ].join("\n"));
  check("读取：旧 goose-note 分栏标记仍能还原",
    JSON.stringify(layoutShape(findLayout(legacy as any[]))) === JSON.stringify(expected),
    layoutShape(findLayout(legacy as any[])));

  // 2. 外部复制的分栏 Markdown 源码粘贴（粘贴识别 + 本地解析）
  const pasted = markdown;
  check("粘贴：识别出分栏标记，走本地解析", plainHasGooseColumnMarkers(pasted));
  check("粘贴：解析结果仍是分栏", !!findLayout(importMarkdownFragment(pasted) as any[]));

  // 3. AI 写入：AI 输出里带分栏时不被拆散
  const aiBlocks = parseAiMarkdownToBlocks(pasted) as any[];
  check("AI 插入：分栏外壳和栏内容都保留",
    JSON.stringify(layoutShape(findLayout(aiBlocks))) === JSON.stringify(expected),
    layoutShape(findLayout(aiBlocks)));

  // 4. AI 页面摘要能看到栏内标题和正文
  const summary = extractStructureSummary(SAMPLE as any);
  check("AI 摘要：包含栏内标题", summary.includes("## 左栏标题"), summary);
  check("AI 摘要：包含栏内正文", summary.includes("右栏正文"), summary);

  // 5. 分享长图 / 卡片
  const cardHtml = renderBlocks(SAMPLE, NOTEBOOK_THEME as any);
  check("分享图片：按 60/40 并排", /class="export-columns" style="grid-template-columns:minmax\(0,60fr\) minmax\(0,40fr\)"/.test(cardHtml), cardHtml.slice(0, 300));
  check("分享图片：两栏各自成列", (cardHtml.match(/class="export-column"/g) ?? []).length === 2);
  check("分享图片：栏内不再多缩进一层", !/nested-children/.test(cardHtml));

  // 6. Word：一行无边框表格，栏宽 60/40
  const font = { body: "Arial", eastAsia: "Arial", mono: "Courier New" };
  const children = await processBlockChildren(SAMPLE, 0, { font, numbering: { numbered: 0 } });
  const doc = new Document({ sections: [{ children }] });
  const xml = strFromU8(unzipSync(new Uint8Array(await Packer.toBuffer(doc)))["word/document.xml"]);
  const grids = [...xml.matchAll(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/g)]
    .map((grid) => [...grid[1].matchAll(/w:w="(\d+)"/g)].map((match) => Number(match[1])));
  const gridCols = grids.find((grid) => grid.length === 2) ?? [];
  check("Word：生成两列表格", gridCols.length === 2, grids);
  // 左栏宽度含栏间距 360，扣掉后按正文比例算。
  check("Word：列宽约 60/40", gridCols.length === 2 && Math.abs((gridCols[0] - 360) / (gridCols[0] + gridCols[1] - 360) - 0.6) < 0.01, gridCols);
  check("Word：两栏文字都在同一行表格里", /<w:tr>[\s\S]*LEFT[\s\S]*RIGHT[\s\S]*<\/w:tr>/.test(xml));

  // 7. PDF 备用通道：左右并排的 View
  const pdf = await createPdfDocument(SAMPLE, {
    paragraph: (block) => String((block.content as any)?.[0]?.text ?? ""),
    heading: (block) => String((block.content as any)?.[0]?.text ?? ""),
  }, "Helvetica");
  const rows: any[] = [];
  walk(pdf, (node) => { if (node.props?.style?.flexDirection === "row") rows.push(node); });
  const widths = rows[0]?.props?.children?.map((column: any) => column.props?.style?.width);
  check("PDF 备用通道：分栏变成一行并排", rows.length === 1, rows.length);
  check("PDF 备用通道：栏宽 60%/40%", JSON.stringify(widths) === JSON.stringify(["60%", "40%"]), widths);

  return checker.failed;
}
