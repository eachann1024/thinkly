/**
 * 文件夹下拉：选中当帧换色，打开 200ms、关闭 150ms 且关闭快启动。
 * 运行：node scripts/verify/run.mjs notebook-switch
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FLOATING_MENU_CLOSE_MS,
  FLOATING_MENU_EASE_IN,
  FLOATING_MENU_OPEN_MS,
  NOTEBOOK_MENU_CLOSE_MS,
  NOTEBOOK_MENU_EASE,
  NOTEBOOK_MENU_OPEN_MS,
  floatingMenuMotionStyle,
} from "@/components/ui/floating-menu-motion";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function ruleBody(css: string, selector: string): string {
  const at = css.indexOf(selector);
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return open < 0 || close < 0 ? "" : css.slice(open + 1, close);
}

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const css = read("src/pages/workspace/components/sidebar/notebook-switcher.css");
  const row = read("src/pages/workspace/components/sidebar/notebook-switcher/shared.tsx");
  const menu = read("src/pages/workspace/components/sidebar/notebook-switcher/renderNotebookMenu.tsx");
  const popover = read("src/components/ui/popover/state.tsx");
  const active = read("src/stores/notebooks/activeActions.ts");
  const sensors = read("src/pages/workspace/components/sidebar/notebook-switcher/useNotebookSwitcherState.tsx");
  const motion = read("src/components/ui/floating-menu-motion.ts");

  const open = floatingMenuMotionStyle("open", "bottom-start", "full", { notebook: true });
  const close = floatingMenuMotionStyle("close", "bottom-start", "full", { notebook: true });
  const instant = floatingMenuMotionStyle("close", "bottom-start", "instant", { notebook: true });
  const plainClose = floatingMenuMotionStyle("close", "bottom", "full");
  const plainOpen = floatingMenuMotionStyle("open", "bottom", "full");

  check("笔记本打开 200ms", NOTEBOOK_MENU_OPEN_MS === 200 && open.transitionDuration === "200ms" && open.opacity === 1);
  check(
    "笔记本关闭 150ms，曲线与打开相同且快启动",
    NOTEBOOK_MENU_CLOSE_MS === 150
      && close.transitionDuration === "150ms"
      && close.opacity === 0
      && close.transitionTimingFunction === open.transitionTimingFunction
      && close.transitionTimingFunction === NOTEBOOK_MENU_EASE
      && NOTEBOOK_MENU_EASE.startsWith("cubic-bezier(.22,1,"),
  );
  check("关闭仍只动透明度和位移", close.transitionProperty === "opacity, transform");
  check("键盘即时关闭时长是 0", instant.transitionDuration === "0ms");
  check(
    "普通菜单时长和关闭慢启动没被改",
    FLOATING_MENU_OPEN_MS === 200
      && FLOATING_MENU_CLOSE_MS === 150
      && plainOpen.transitionDuration === "200ms"
      && plainClose.transitionDuration === "150ms"
      && plainClose.transitionTimingFunction === FLOATING_MENU_EASE_IN,
  );
  check(
    "弹出层仍用这两个常量，键盘关闭仍写死 0",
    popover.includes("variant === \"notebook\" ? NOTEBOOK_MENU_OPEN_MS")
      && popover.includes("keyboard.current ? 0 : variant === \"notebook\" ? NOTEBOOK_MENU_CLOSE_MS"),
  );

  const highlight = ruleBody(css, ".goose-notebook-menu-surface :is(.goose-notebook-row, .goose-notebook-add-action)");
  check("行和添加按钮的底色过渡关掉，且不用 !important", /transition:\s*none/.test(highlight) && !highlight.includes("!important"));
  check("普通列表行的 150ms 过渡还在", read("src/styles/global/control-states.css").includes("transition: background-color var(--goose-control-motion-duration)"));

  const actions = ruleBody(css, ".goose-notebook-row-actions {");
  const hover = ruleBody(css, ".goose-notebook-row:is(:hover, :focus-within) > .goose-notebook-row-end > .goose-notebook-row-actions");
  const coarse = css.slice(css.indexOf("@media (hover: none)"));
  check("操作按钮改为占位隐藏", /display:\s*flex/.test(actions) && /visibility:\s*hidden/.test(actions) && !/display:\s*none/.test(actions));
  check("悬停或聚焦才显示操作按钮", /visibility:\s*visible/.test(hover));
  check("触摸设备仍显示操作按钮", /visibility:\s*visible/.test(coarse));
  check("不用透明占位，避免挡住点击", !/opacity:\s*0/.test(actions) && !/opacity:\s*0/.test(hover));
  check("勾号始终挂载，未选中只隐藏", row.includes("invisible h-4 w-4 shrink-0") && !row.includes("{isActive &&"));
  check("勾号和按钮在同一组里贴右", row.includes("goose-notebook-row-end") && ruleBody(css, ".goose-notebook-row-end").includes("margin-inline-start: auto"));

  const activateAt = menu.indexOf("void activateNotebook(id)");
  const closeAt = menu.indexOf("setIsOpen(false)", activateAt);
  check("点选先切库再关菜单", activateAt > 0 && closeAt > activateAt);
  check("拖拽仍要按住 200ms", sensors.includes("delay: 200"));
  check("同库再点仍写入并重扫", active.includes("set({ activeNotebookId: id })") && active.includes("loadLocalFolderPages"));
  check("切库函数没有先把活动页写成空", !active.slice(active.indexOf("setActiveNotebook"), active.indexOf("getNotebook")).includes("setActivePage(null)"));
  check("笔记本位移缩放常量还在", motion.includes("scale(.985)"));

  return checker.failed;
}
