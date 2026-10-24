import { buildImageExportPreviewHtml } from "@/lib/imageExport/livePreview";
import { buildStyledHTML } from "@/lib/imageExport/serializer/builder";
import { NOTEBOOK_THEME } from "@/lib/imageExport/themes";
import { createChecker } from "./lib/check";

const text = (value: string) => [{ type: "text", text: value, styles: {} }];

export default function run() {
  const checker = createChecker();
  const paragraphs = Array.from({ length: 12000 }, (_, i) => ({
    type: "paragraph",
    content: text(`行 ${i} ${"字".repeat(80)}`),
  }));
  const started = performance.now();
  const html = buildImageExportPreviewHtml({
    title: "预览",
    blocks: paragraphs as never,
    theme: NOTEBOOK_THEME,
    mode: "selection",
  });
  const elapsed = performance.now() - started;
  checker.check("一万二千段预览不超过 20 毫秒", elapsed < 20, Math.round(elapsed * 10) / 10);
  checker.check("预览含开头", html.includes("行 0"));
  checker.check("预览不含文末", !html.includes("行 11999"));
  checker.check("预览不请求网络字体", !html.includes("fonts.googleapis.com"));
  checker.check(
    "笔记本没有点阵",
    !(NOTEBOOK_THEME.decorations ?? []).some((item) => item.kind === "dot-grid"),
  );
  checker.check("笔记本预览没有点阵", !html.includes("1.1px, transparent 1.5px"));

  const giant = [{ type: "paragraph", content: text(`开头${"长".repeat(2_000_000)}结尾标记`) }];
  const giantStarted = performance.now();
  const giantHtml = buildImageExportPreviewHtml({
    title: "长段",
    blocks: giant as never,
    theme: NOTEBOOK_THEME,
    mode: "selection",
  });
  checker.check(
    "两百万字的一段不超过 20 毫秒",
    performance.now() - giantStarted < 20,
    Math.round(performance.now() - giantStarted),
  );
  checker.check("长段只保留开头", giantHtml.includes("开头") && !giantHtml.includes("结尾标记"));

  const rows = Array.from({ length: 8000 }, (_, i) => ({ cells: [`r${i}`, "乙", "丙", "丁"] }));
  const tableStarted = performance.now();
  const tableHtml = buildImageExportPreviewHtml({
    title: "大表",
    blocks: [{ type: "table", content: { type: "tableContent", rows } }] as never,
    theme: NOTEBOOK_THEME,
    mode: "selection",
  });
  checker.check(
    "八千行表格不超过 20 毫秒",
    performance.now() - tableStarted < 20,
    Math.round(performance.now() - tableStarted),
  );
  checker.check("大表留表头附近", tableHtml.includes("r0") && !tableHtml.includes("r7999"));

  const exportHtml = buildStyledHTML({
    title: "导出",
    blocksHtml: "<p>正文</p>",
    theme: NOTEBOOK_THEME,
  });
  checker.check("正式导出仍带字体样式表", exportHtml.includes("fonts.googleapis.com"));
  return checker.failed;
}
