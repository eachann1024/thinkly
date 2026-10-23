/**
 * 全屏 AI 时，点大纲或文件列表一次就切回笔记；再点 AI 图标也一次关闭。
 * 运行：node scripts/verify/run.mjs fullscreen-ai-rail
 */
import {
  aiToggleSteps,
  sidebarViewClickAction,
  viewClickLeavesFullscreenAi,
} from "../../src/pages/workspace/components/sidebar/sidebar-shell/railClick";
import { createChecker } from "./lib/check";

const showing = {
  alreadyShowing: true,
  sidebarCollapsed: false,
  settingsOpen: false,
  inHistoryMode: false,
  preview: false,
} as const;

export default function run() {
  const checker = createChecker();
  const pagesWhileAi = sidebarViewClickAction({
    view: "pages",
    ...showing,
    aiFullscreenOpen: true,
  });
  const outlineWhileAi = sidebarViewClickAction({
    view: "outline",
    ...showing,
    aiFullscreenOpen: true,
  });
  checker.check(
    "全屏 AI 时再点当前文件列表会切回笔记，而不是只收起侧栏",
    pagesWhileAi === "show" && viewClickLeavesFullscreenAi("pages"),
  );
  checker.check(
    "全屏 AI 时再点当前大纲会切回笔记，而不是只收起侧栏",
    outlineWhileAi === "show" && viewClickLeavesFullscreenAi("outline"),
  );
  checker.check(
    "没有全屏 AI 时，再点当前文件列表仍收起侧栏",
    sidebarViewClickAction({ view: "pages", ...showing, aiFullscreenOpen: false }) === "collapse",
  );
  checker.check(
    "没有全屏 AI 时，从文件列表点大纲是切换而不是收起",
    sidebarViewClickAction({
      view: "outline",
      ...showing,
      alreadyShowing: false,
      aiFullscreenOpen: false,
    }) === "show" && viewClickLeavesFullscreenAi("outline"),
  );
  checker.check(
    "搜索图标仍走自己的开关",
    sidebarViewClickAction({ view: "search", ...showing, aiFullscreenOpen: true }) === "search",
  );

  const close = aiToggleSteps({
    available: true,
    settingsOpen: false,
    aiFullscreen: true,
    panelOpen: true,
    forceCollapseRight: false,
    rightExpandOverride: false,
  });
  const closeAgain = aiToggleSteps({
    available: true,
    settingsOpen: false,
    aiFullscreen: true,
    panelOpen: true,
    forceCollapseRight: true,
    rightExpandOverride: true,
  });
  checker.check(
    "全屏 AI 已打开时，点 AI 图标只关闭一次",
    close.length === 1 && close[0]?.type === "close",
  );
  checker.check(
    "全屏状态下重复点击 AI 图标仍是关闭，不会被切回打开",
    closeAgain.length === 1 && closeAgain[0]?.type === "close",
  );
  const open = aiToggleSteps({
    available: true,
    settingsOpen: false,
    aiFullscreen: true,
    panelOpen: false,
    forceCollapseRight: false,
    rightExpandOverride: false,
  });
  checker.check(
    "全屏布局但面板已关时，点 AI 图标会打开",
    open.length === 1 && open[0]?.type === "toggle",
  );
  const overlay = aiToggleSteps({
    available: true,
    settingsOpen: false,
    aiFullscreen: false,
    panelOpen: true,
    forceCollapseRight: true,
    rightExpandOverride: true,
  });
  checker.check(
    "窄窗侧栏并排仍只收起覆盖层，不走全屏关闭",
    overlay.length === 1 && overlay[0]?.type === "set-right-override" && overlay[0].value === false,
  );
  return checker.failed;
}
