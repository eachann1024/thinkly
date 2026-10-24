import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import { editorOverlayReducer, initialEditorOverlays } from "../../src/components/editor/core/editorOverlayState";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function ruleBody(css: string, selector: string) {
  const selectorAt = css.indexOf(selector);
  if (selectorAt < 0) return "";
  const open = css.indexOf("{", selectorAt + selector.length);
  const close = css.indexOf("}", open + 1);
  return open < 0 || close < 0 ? "" : css.slice(open + 1, close);
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const bar = read("src/components/editor/find/FindInPageBar.tsx");
  const layout = read("src/components/editor/find/useFindInPageLayout.ts");
  const composer = read("src/components/editor/core/EditorComposer.tsx");
  const split = read("src/pages/workspace/components/editor-split/SplitEditorPane.tsx");
  const overlays = read("src/pages/workspace/styles/editor-base/overlays.css");
  const plugin = read("src/components/editor/find/findInPagePlugin.ts");

  check(
    "查找栏通过编辑器 ref portal 到最近所属 overlay host，普通编辑器保留 fixed fallback",
    layout.includes('closest<HTMLElement>("[data-editor-overlay-host]")') &&
      bar.includes("createPortal(bar, host)") &&
      layout.includes("position: host ? \"absolute\" : \"fixed\"") &&
      composer.includes("editorContainerRef={editorContainerRef}") &&
      split.includes("data-editor-overlay-host") && split.includes("relative"),
  );

  check(
    "所属 host 内定位并限制宽高，保留 UI 缩放间距和滚动可达性",
    layout.includes("right: offset") &&
      layout.includes("top,") &&
      layout.includes('width: "calc(26rem * var(--editor-scale, 1))"') &&
      layout.includes('maxWidth: `max(0px, calc(100% - ${offset * 2}px))`') &&
      layout.includes('maxHeight: `max(0px, calc(${host ? "100%" : "100dvh"} - ${top} - ${offset}px))`') &&
      layout.includes("overflow: \"auto\"") &&
      bar.includes('width: "100%"'),
  );

  check(
    "窄空间下查找和替换行可换行，输入框允许收缩且菜单表面有实体主题背景",
    bar.includes("min-h-6 min-w-0 flex-wrap items-center gap-1") &&
      bar.includes("h-6 min-w-[min(5rem,100%)] w-44 flex-1") &&
      bar.includes("bg-popover") &&
      !bar.includes("bg-background/95") &&
      (bar.match(/min-h-6 min-w-0 flex-wrap items-center gap-1/g)?.length ?? 0) === 2,
  );

  check(
    "portal 宿主变化后重新聚焦目标输入框，打开替换时等待替换输入挂载",
    bar.includes("useLayoutEffect(() =>") &&
      bar.includes("target?.focus()") &&
      bar.includes("target?.select()") &&
      bar.includes("if (openReplace && !replaceInputRef.current)") &&
      bar.includes("queueMicrotask(focus)") &&
      bar.includes("[open, openNonce, openReplace, host]"),
  );

  check(
    "查询与替换文案仅为组件内存状态，没有新增持久化写入",
    /const \[query, setQuery\] = useState\(""\)/.test(bar) &&
      /const \[replacement, setReplacement\] = useState\(""\)/.test(bar) &&
      !/localStorage|sessionStorage|indexedDB|persist\w*\s*\(/i.test(bar) &&
      editorOverlayReducer(initialEditorOverlays, { type: "find-requested", request: { seed: "词", replace: true, nonce: 1 } }).find.phase === "pending" &&
      editorOverlayReducer(initialEditorOverlays, { type: "find-requested", request: { seed: "词", replace: true, nonce: 1 } }).find.phase !== "closed",
  );

  check(
    "Enter/Shift+Enter 导航、Escape 关闭，替换 Enter 与主修饰键加 Alt 分别执行单项和全部替换",
    bar.includes('if (event.key === "Enter")') &&
      bar.includes('handleStep(event.shiftKey ? -1 : 1)') &&
      bar.includes('event.key === "Escape"') &&
      bar.includes("onClose()") &&
      bar.includes("isPlatformPrimaryModifierEvent(event)") &&
      bar.includes("handleReplaceAll()") &&
      bar.includes("handleReplace()") &&
      bar.includes("replaceCurrentMatch(editor, replacement)") &&
      bar.includes("replaceAllMatches(editor, replacement)") &&
      plugin.includes("createReplaceCurrentTransaction") &&
      plugin.includes("createReplaceAllTransaction"),
  );

  const findHidden = ruleBody(
    overlays,
    "body:is([data-goose-settings-open], [data-goose-ai-fullscreen]) [data-goose-find-in-page]",
  );
  check(
    "设置页和全屏 AI 下沿用共享浮层隐藏规则",
    Boolean(findHidden.trim()) && findHidden.includes("display: none !important"),
  );

  return checker.failed;
}
