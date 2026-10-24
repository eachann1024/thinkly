import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  SELECTION_QUOTE_CLOSE,
  selectionQuoteIconsCentered,
  selectionQuoteMarkAspect,
  selectionQuoteMarkBox,
  selectionQuoteMarkViewBoxAttr,
} from "../../src/components/editor/ai/composer/selectionQuoteAlign";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function cssBody(css: string, selector: string) {
  const blocks: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let match = re.exec(css); match; match = re.exec(css)) {
    if (match[1].split(",").some((part) => part.trim() === selector)) blocks.push(match[2]);
  }
  return blocks.join("\n");
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const css = read("src/components/editor/ai/composer/selection-quote.css");
  const dom = read("src/components/editor/ai/composer/selectionQuoteDom.ts");
  const box = selectionQuoteMarkBox();

  check("引号墨迹中线与图标盒子中线重合，关闭叉穿过视口中心", selectionQuoteIconsCentered());
  check("引号盒子高宽为正", box.width > 0 && box.height > 0 && box.height < box.width, box);
  check(
    "关闭叉边长小于 18px 点击区，避免撑高引用条",
    SELECTION_QUOTE_CLOSE.size > 0 && SELECTION_QUOTE_CLOSE.size < 18,
    SELECTION_QUOTE_CLOSE.size,
  );

  const preview = cssBody(css, ".ai-selection-quote-preview");
  const remove = cssBody(css, ".ai-selection-quote-remove");
  const mark = cssBody(css, ".ai-selection-quote-mark");
  const label = cssBody(css, ".ai-selection-quote-label");
  check("预览行用弹性盒垂直居中，行高压成字号", preview.includes("display: inline-flex") && preview.includes("align-items: center") && preview.includes("line-height: 1"));
  check("关闭按钮用弹性盒居中，不再靠字号把乘号顶上天", remove.includes("display: inline-flex") && remove.includes("align-items: center") && remove.includes("justify-content: center") && remove.includes("line-height: 1"));
  check("引号图标高度跟随字号，宽高比等于墨迹盒", mark.includes("height: 0.5em") && mark.includes(`aspect-ratio: ${selectionQuoteMarkAspect()}`));
  check("摘要仍单行截断", label.includes("text-overflow: ellipsis") && label.includes("white-space: nowrap") && label.includes("line-height: 1"));
  check("引用条不再用手写位移对齐", !/margin-top|translate|top:|bottom:/.test([preview, remove, mark, label].join("\n")));
  check("不再用装饰引号字符当图标", !css.includes("❞") && !dom.includes("❞"));

  check("图标 viewBox 来自墨迹盒", dom.includes("selectionQuoteMarkViewBoxAttr()") && selectionQuoteMarkViewBoxAttr() === `${box.x} ${box.y} ${box.width} ${box.height}`);
  check("关闭图标使用居中的叉，而不是基线字符", dom.includes("appendQuoteClose(remove)") && !dom.includes('textContent = "×"') && dom.includes("SELECTION_QUOTE_CLOSE"));
  check("摘要放进独立标签，截断不带走图标", dom.includes('label.className = "ai-selection-quote-label"'));

  return checker.failed;
}
