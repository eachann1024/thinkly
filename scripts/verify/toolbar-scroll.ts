import { readFileSync } from "node:fs";
import { createChecker } from "./lib/check";

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const read = (file: string) => readFileSync(file, "utf8");
  const layout = read("src/components/editor/toolbars/formatting/FormattingToolbarLayout.tsx");
  const hook = read("src/components/editor/toolbars/formatting/useToolbarHorizontalScroll.ts");
  const css = read("src/pages/workspace/styles/editor-base/toolbars/formatting.css");
  const row = css.match(/\[data-formatting-toolbar\]\[data-goose-floating-toolbar="true"\]\s*\.goose-formatting-toolbar-row\s*\{([^}]+)\}/)?.[1] ?? "";

  check("主编辑器与速记均启用横向滚轮并绑定实际内容行",
    layout.includes("useToolbarHorizontalScroll(true)") &&
    layout.includes('ref={rowRef} className="goose-formatting-toolbar-row"'));
  check("浮动栏保持单行，允许横向滚动并关闭纵向溢出",
    /flex-wrap:\s*nowrap/.test(row) && /overflow-x:\s*auto/.test(row) &&
    /overflow-y:\s*hidden/.test(row));
  check("无溢出与缩放手势不被拦截，原生横向手势保留",
    hook.includes("event.ctrlKey") && hook.includes("row.scrollWidth <= row.clientWidth") &&
    hook.includes("Math.abs(event.deltaX) > Math.abs(event.deltaY)"));
  check("上下滚轮映射为横向位移并阻止正文滚动，监听可清理",
    hook.includes("event.preventDefault()") && hook.includes("row.scrollLeft += event.deltaY * unit") &&
    hook.includes('{ passive: false }') && hook.includes('row.removeEventListener("wheel", onWheel)'));
  return checker.failed;
}
