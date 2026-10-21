import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  TOAST_LAYOUT,
  toastCloseRight,
  toastCloseTop,
  toastContentReserve,
  toastGeometry,
  toastIconOffset,
  toastLayoutCssVars,
} from "../../src/components/ui/toast-layout";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

/** 取出 CSS 中选择器包含关键字的规则体。 */
function cssRules(css: string, selectorIncludes: string): string[] {
  const rules: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    if (m[1].includes(selectorIncludes)) rules.push(m[2]);
  }
  return rules;
}

/** 全局通知：统一入口、三个窗口挂载 Toaster、图标 / 文字 / 关闭按钮对齐第一行中线。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const L = TOAST_LAYOUT;

  console.log("· 对齐计算");
  check("关闭按钮与 IconButton xs 同为 24px、图标 20px、行高 20px", L.close === 24 && L.icon === 20 && L.line === 20, L);
  check("图标偏移 = (行高 - 图标) / 2", toastIconOffset() === (L.line - L.icon) / 2);
  check("关闭按钮 top = pad + (行高 - 按钮) / 2", toastCloseTop() === L.padY + (L.line - L.close) / 2, toastCloseTop());
  const single = toastGeometry({ lines: 1 });
  const mid = single.height / 2;
  check("单行：关闭按钮中心 = 图标中心 = 文字中线 = 高度一半",
    single.closeCenter === mid && single.iconCenter === mid && single.firstLineCenter === mid, single);
  for (const lines of [2, 3]) {
    const g = toastGeometry({ lines });
    check(`${lines} 行：关闭按钮与图标对齐第一行中线`, g.closeCenter === g.firstLineCenter && g.iconCenter === g.firstLineCenter, g);
    check(`${lines} 行：关闭按钮不贴顶且 top = pad + (line - close) / 2`, g.closeTop > 0 && g.closeTop === L.padY + (L.line - L.close) / 2, g);
    check(`${lines} 行：关闭按钮不再是整条居中`, g.closeCenter < g.height / 2, g);
  }
  for (const lines of [1, 2]) {
    const g = toastGeometry({ lines, action: true });
    check(`带操作按钮（${lines} 行）：按钮、关闭按钮与图标对齐第一行中线`, g.actionCenter === g.firstLineCenter && g.closeCenter === g.firstLineCenter && g.iconCenter === g.firstLineCenter && g.closeTop > 0, g);
    check(`带操作按钮（${lines} 行）：按钮同排不增加高度`, g.height === toastGeometry({ lines }).height, g);
  }
  check("关闭按钮 X 图形右缘落在内边距线上", toastCloseRight() + (L.close - L.closeGlyph) / 2 === L.padX);
  check("内容区为关闭按钮留出空间", L.padX + toastContentReserve() === toastCloseRight() + L.close + L.closeGap, toastContentReserve());

  console.log("· CSS 与 TS 同值");
  const layoutCss = read("src/styles/toast/layout.css");
  const vars = toastLayoutCssVars();
  const mismatched = Object.entries(vars).filter(([name, value]) => !layoutCss.includes(`${name}: ${value};`));
  check("layout.css 兜底变量与 toast-layout.ts 一致", mismatched.length === 0, mismatched);
  const sonnerTsx = read("src/components/ui/sonner.tsx");
  check("Toaster 把 toastLayoutCssVars 写到根 style", /style=\{\{\s*\.\.\.\(toastLayoutCssVars\(\)/.test(sonnerTsx));
  const closeRules = cssRules(layoutCss, "[data-close-button]").join("\n");
  check("关闭按钮 top 用共享公式", closeRules.includes("top: calc(var(--goose-toast-pad-y) + (var(--goose-toast-line) - var(--goose-toast-close)) / 2)"));
  const iconRules = cssRules(layoutCss, "[data-icon]").join("\n");
  check("图标 margin-top 用共享公式", iconRules.includes("calc((var(--goose-toast-line) - var(--goose-toast-icon)) / 2)"));
  check("标题行高用共享变量", cssRules(layoutCss, "[data-title]").some(body => body.includes("line-height: var(--goose-toast-line)")));
  check("标题与描述允许无空格长串断行", cssRules(layoutCss, "[data-description]").some(body => body.includes("overflow-wrap: anywhere")));
  const clampRules = cssRules(layoutCss, ":not(.goose-delete-receipt-toast) [data-title]").join("\n");
  check("多行文案最多 4 行并隐藏溢出，删除回执不参与", /-webkit-line-clamp: var\(--goose-toast-max-lines, 4\)/.test(clampRules) && clampRules.includes("overflow: hidden"));
  check("删除失败文案不再用 overflow: visible 冲掉行数上限", !cssRules(layoutCss, ".goose-delete-failure-toast").some(body => /overflow:\s*visible/.test(body)));

  console.log("· 统一入口");
  const sources = walk("src").filter(file => /\.(tsx?|mts)$/.test(file) && !file.endsWith(".d.ts"));
  const direct = sources.filter(file => file !== "src/components/ui/sonner.tsx" && /from\s+["']sonner["']/.test(read(file)));
  check("src 下除 sonner.tsx 外无文件直接从 sonner 导入", direct.length === 0, direct);
  check("统一入口不提供绕过布局的 toast.custom", !/custom:\s*sonnerToast/.test(sonnerTsx));
  const custom = sources.filter(file => /\btoast\.custom\(/.test(read(file)));
  check("业务侧不再自绘 toast.custom", custom.length === 0, custom);
  for (const [label, file] of [["主窗", "src/App.tsx"], ["速记小窗", "src/pages/quick-note/QuickNoteApp.tsx"], ["搜索浮窗", "src/pages/search-window/SearchWindowApp.tsx"]]) {
    const code = read(file);
    check(`${label}挂载 Toaster`, /<Toaster[\s/>]/.test(code) && /import \{[^}]*\bToaster\b[^}]*\} from "@\/components\/ui\/sonner"/.test(code));
  }

  console.log("· 无单独关闭按钮定位覆盖");
  const overridePattern = /!?(?:top|right|left)-(?:1\/2|\d+(?:\.\d+)?)|-translate-y-1\/2|!absolute/;
  const closeClassLines = sources
    .flatMap(file => read(file).split("\n").map(line => [file, line] as const))
    .filter(([, line]) => /closeButton\s*:/.test(line) && overridePattern.test(line));
  check("组件里 closeButton 类名无定位覆盖", closeClassLines.length === 0, closeClassLines.map(([file]) => file));
  const toastCss = ["error.css", "success.css", "actions.css"].map(name => read(`src/styles/toast/${name}`)).join("\n");
  const cssCloseOverrides = cssRules(toastCss, "close").filter(body => /\b(top|right|left|width|height|transform)\s*:/.test(body));
  check("语义样式里关闭按钮只改颜色不改定位", cssCloseOverrides.length === 0, cssCloseOverrides);
  const layoutCloseFixed = cssRules(layoutCss, "[data-close-button]").filter(body => /\btop:\s*\d|top:\s*50%|translateY/.test(body));
  check("layout.css 关闭按钮无硬编码 top", layoutCloseFixed.length === 0, layoutCloseFixed);
  const sharedCss = walk("src").filter(file => file.endsWith(".css") && !file.startsWith("src/styles/toast/"));
  const strayClose = sharedCss.filter(file => /\[data-close-button\]|goose-toast-close/.test(read(file)));
  check("其它样式文件不碰 toast 关闭按钮", strayClose.length === 0, strayClose);

  return checker.failed;
}
