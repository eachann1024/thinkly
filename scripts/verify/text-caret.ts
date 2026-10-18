import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { createChecker } from "./lib/check";

// 光标只由浏览器排版引擎绘制。结构检查防止全局镜像/隐藏规则再次进入入口；
// 不用 DOM 模拟器推断原生光标几何，真实输入交互另在浏览器验收。
const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
function files(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

export default function run() {
  const checker = createChecker();
  const sources = files("src").filter((file) => /\.(?:css|tsx?)$/.test(file));
  const overlay = sources.filter((file) => /useTextCaret|data-goose-caret-active|goose-text-caret-blink|className\s*=\s*["']goose-text-caret["']/.test(read(file)));
  checker.check("全部输入入口移除自绘光标和原生光标屏蔽属性", overlay.length === 0, overlay);

  const hidden: string[] = [];
  for (const file of sources.filter((file) => file.endsWith(".css"))) {
    postcss.parse(read(file)).walkDecls("caret-color", (decl) => {
      const selector = decl.parent?.type === "rule" ? decl.parent.selector : "";
      // 唯一有意隐藏输入的地方：AI 忙态由 ticker 占据原输入槽。
      if (file.endsWith("editor-ai-menu/input-controls.css") && selector === ".goose-ai-prompt-field--busy .goose-ai-prompt-field__textarea") return;
      // 只接受已核对的主题色，避免漏掉 slash-alpha、透明 hex 等等价写法。
      if (!/^var\(--goose-(?:text-caret|accent-focus|text-link)\)$/.test(decl.value)) hidden.push(`${file}: ${selector} → ${decl.value}`);
    });
  }
  checker.check("空输入、选区和合成输入均保留原生光标（仅 AI 忙态隐藏）", hidden.length === 0, hidden);

  const css = postcss.parse(read("src/styles/global/text-caret.css"));
  let theme = false;
  let controls = false;
  css.walkDecls("--goose-text-caret", (decl) => { theme ||= decl.value === "hsl(var(--primary))"; });
  css.walkRules((rule) => {
    const selectors = ["input", "textarea", '[contenteditable="true"]', '[contenteditable="plaintext-only"]', ".bn-editor .bn-inline-content"];
    if (selectors.every((selector) => rule.selector.includes(selector))) {
      rule.walkDecls("caret-color", (decl) => { controls ||= decl.value === "var(--goose-text-caret)"; });
    }
  });
  checker.check("普通输入、密码、多行、正文及 AI 编辑器共享主题光标色", theme && controls);
  checker.check("全局 CSS 在共享启动阶段加载，无需等待 focus/input 事件", read("src/index.css").includes('@import "./styles/global/text-caret.css";') && read("src/main.tsx").includes('import "./index.css";'));
  checker.check("主窗口、独立速记、搜索浮窗及控件样本共用启动与样式", ["src/index-entry.tsx", "src/quicknote.tsx", "src/search.tsx"].every((file) => /from ["']\.\/main["']/.test(read(file))) && read("src/index-entry.tsx").includes("ControlGallery"));
  return checker.failed;
}
