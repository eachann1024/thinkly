/**
 * 分栏页签标题与拖拽把手：平时只显示名称，悬停名称才显示把手并藏起名称，离开后名称回来。
 * 运行：node scripts/verify/run.mjs split-title-grip
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  paneTitleChrome,
  paneTitleGripBlur,
  paneTitleGripFocus,
  paneTitlePointerEnter,
  paneTitlePointerIdle,
  paneTitlePointerLeave,
  paneTitleShowsGrip,
  paneTitleShowsName,
} from "@/pages/workspace/components/editor-split/paneTitleChrome";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function ruleBodies(css: string, selector: string): string[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bodies: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let match = re.exec(clean); match; match = re.exec(clean)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    if (selectors.includes(selector)) bodies.push(match[2]);
  }
  return bodies;
}

function showsName(state: Parameters<typeof paneTitleChrome>[0]): boolean {
  const chrome = paneTitleChrome(state);
  return paneTitleShowsName(chrome) && !paneTitleShowsGrip(chrome);
}

function showsGrip(state: Parameters<typeof paneTitleChrome>[0]): boolean {
  const chrome = paneTitleChrome(state);
  return paneTitleShowsGrip(chrome) && !paneTitleShowsName(chrome);
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 名称与把手");
  const idle = paneTitlePointerIdle;
  check("默认显示名称，拖拽把手隐藏", showsName(idle) && idle.pointerOnTitle === false && idle.gripFocused === false);
  const hovering = paneTitlePointerEnter(idle);
  check("悬停名称时显示把手并隐藏名称", showsGrip(hovering));
  const left = paneTitlePointerLeave(hovering);
  check("指针离开后名称回来、把手消失", showsName(left) && left.pointerOnTitle === false && left.gripFocused === false);
  const mouseFocus = paneTitleGripFocus(hovering, false);
  check("鼠标点按把手不算键盘焦点，离开后名称仍回来", showsName(paneTitlePointerLeave(mouseFocus)));
  const keyed = paneTitleGripFocus(idle, true);
  check("键盘焦点在把手上时显示把手并隐藏名称", showsGrip(keyed));
  check("键盘焦点离开后恢复名称", showsName(paneTitleGripBlur(keyed)));

  console.log("· 页签结构");
  const header = read("src/pages/workspace/components/editor-split/SplitPaneHeader.tsx");
  const actionsAt = header.indexOf('className="editor-split-header-actions"');
  const handleAt = header.indexOf("editor-split-drag-handle");
  const slotAt = header.indexOf("editor-split-header-title-slot");
  check("名称槽包着标题和把手", slotAt !== -1 && handleAt > slotAt && header.includes("editor-split-header-title"));
  check("把手不在更多、关闭那一组", actionsAt > handleAt);
  const actions = header.slice(actionsAt);
  check("更多和关闭仍留在页签右侧", actions.includes("SplitPaneMoreMenu") && actions.includes("editor-split-close"));
  check("操作组里没有拖拽把手", !actions.includes("editor-split-drag-handle") && !actions.includes("data-split-drag-handle"));
  check("名称槽用悬停状态切换", header.includes("data-pane-title-chrome={chrome}") && header.includes("paneTitlePointerEnter") && header.includes("paneTitlePointerLeave"));
  const returned = header.slice(header.indexOf("return ("));
  const crumbBlock = returned.match(/editor-split-header-crumb[\s\S]*?<\/div>/);
  const slotUse = returned.indexOf("{titleSlot}");
  const actionsUse = returned.indexOf('className="editor-split-header-actions"');
  check("名称槽在左侧路径和右侧操作之间，不嵌进路径", Boolean(crumbBlock) && !crumbBlock![0].includes("titleSlot") && slotUse > 0 && slotUse < actionsUse);

  console.log("· 样式");
  const css = read("src/pages/workspace/styles/editor-split-drag.css");
  const hidden = ruleBodies(css, ".editor-split-header-title-slot .editor-split-drag-handle").join("\n");
  const shown = ruleBodies(css, '.editor-split-header-title-slot[data-pane-title-chrome="grip"] .editor-split-drag-handle').join("\n");
  const titleHidden = ruleBodies(css, '.editor-split-header-title-slot[data-pane-title-chrome="grip"] .editor-split-header-title').join("\n");
  check("默认把手不占点击、透明收起", /opacity:\s*0/.test(hidden) && /pointer-events:\s*none/.test(hidden));
  check("悬停后把手出现并可拖", /opacity:\s*1/.test(shown) && /pointer-events:\s*auto/.test(shown));
  check("悬停后名称隐藏", /opacity:\s*0/.test(titleHidden));
  const slot = ruleBodies(css, ".editor-split-header-title-slot").join("\n");
  const headerRule = ruleBodies(css, ".editor-split-header").join("\n");
  check("页签左右等分，名称槽居中", /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/.test(headerRule) && /justify-self:\s*center/.test(slot));
  check("把手在页签正中，不靠左也不靠右", /left:\s*50%/.test(hidden) && /translateX\(-50%\)/.test(hidden) && !/left:\s*0/.test(hidden) && !css.includes(".editor-split-header-actions .editor-split-drag-handle"));

  return checker.failed;
}
