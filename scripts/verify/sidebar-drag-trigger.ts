/**
 * 侧栏拖拽落点线与拖宽把手静止色同一套淡出，颜色跟随强调色，不再画左端方头。
 * 运行：node scripts/verify/run.mjs sidebar-drag-trigger
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function gradientAt(css: string, marker: string, occurrence = 0): string {
  let from = 0;
  for (let i = 0; i <= occurrence; i += 1) {
    const at = css.indexOf(marker, from);
    if (at < 0) return "";
    const start = css.indexOf("linear-gradient(", at);
    if (start < 0) return "";
    let depth = 0;
    let end = start;
    for (; end < css.length; end += 1) {
      if (css[end] === "(") depth += 1;
      else if (css[end] === ")" && --depth === 0) break;
    }
    if (i === occurrence) return css.slice(start, end + 1);
    from = end + 1;
  }
  return "";
}

function gradientStops(gradient: string): string[] {
  const open = gradient.indexOf("(");
  const inner = gradient.slice(open + 1, gradient.lastIndexOf(")"));
  return inner
    .split(",")
    .slice(1)
    .map((stop) => stop.trim().replace(/\s+/g, " "));
}

function gradientDirection(gradient: string): string {
  const open = gradient.indexOf("(");
  const comma = gradient.indexOf(",");
  return gradient.slice(open + 1, comma).trim();
}

export default function run() {
  const checker = createChecker();
  const shell = read("src/pages/workspace/styles/workspace/shell.css");
  const dnd = read("src/pages/workspace/styles/sidebar-dnd.css");
  const tree = read("src/pages/workspace/components/sidebar/main-tree/main-tree.css");
  const line = read("src/pages/workspace/components/sidebar/main-tree/row/mainTreeContainers.tsx");
  const edge = read("src/pages/workspace/components/sidebar/main-tree/MainTreeEdgeDropWatcher.tsx");

  const handle = gradientAt(shell, "--workspace-resize-line:");
  const handleDark = gradientAt(shell, "--workspace-resize-line:", 1);
  const drop = gradientAt(
    dnd,
    ".sidebar-tree-drop-line,\n.sidebar-drop-line,\n.main-tree-drop-between-line",
  );
  const handleStops = gradientStops(handle);
  const dropStops = gradientStops(drop);

  checker.check("落点线沿用拖宽把手的色标", handleStops.length === 4 && dropStops.join("|") === handleStops.join("|") && handleDark === handle, dropStops);
  checker.check("拖宽把手仍是竖向", gradientDirection(handle) === "180deg");
  checker.check("落点线改成横向", gradientDirection(drop) === "90deg");
  checker.check("落点线跟随强调色，不写死色值", drop.includes("var(--goose-accent-drag-line)") && !drop.includes("#") && !drop.includes("goose-interactive-selected-fg"));
  checker.check("落点线不发光", /box-shadow:\s*none/.test(dnd.slice(dnd.indexOf(".sidebar-tree-drop-line,"), dnd.indexOf(".sidebar-tree-nest-label"))));
  checker.check("落点线不留方头", !dnd.includes(".sidebar-drop-line::before") && !dnd.includes(".sidebar-tree-drop-line::before") && !dnd.includes(".main-tree-drop-between-line::before") && !tree.includes(".main-tree-drop-between-line::before"));
  const treeLineRules = [...tree.matchAll(/\.main-tree-drop-between-line\s*\{([^}]*)\}/g)].map((match) => match[1]);
  checker.check(
    "主树样式不再铺强调色实底",
    treeLineRules.length > 0 && treeLineRules.every((body) => !/background|box-shadow|width:\s*7px/.test(body)),
    treeLineRules,
  );

  checker.check("行间落点仍是 2px，缩进算法保留", line.includes('className="main-tree-drop-between-line h-[2px]"') && line.includes("marginLeft: lineStart") && line.includes("marginRight: 8"));
  checker.check("底部边缘落点仍贴在列表底边", edge.includes('className="main-tree-drop-between-line main-tree-edge-drop-line"') && edge.includes("height: 2") && edge.includes("viewportRect.bottom - 2"));
  return checker.failed;
}
