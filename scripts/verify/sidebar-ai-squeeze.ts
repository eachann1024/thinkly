import { readFileSync } from "node:fs";
import path from "node:path";
import { PANEL_WIDTH_MIN } from "../../src/pages/workspace/components/notebook-ai/usePanelWidth";
import {
  SIDEBAR_EDITOR_RESERVE,
  resolveSidebarAiSqueeze,
  resolveSidebarMaxWidth,
  sidebarSharedWidth,
} from "../../src/pages/workspace/components/sidebar/sidebar-shell/sidebarAiSqueeze";
import { createChecker } from "./lib/check";

const preferred = 400;
const metrics = {
  stageWidth: 1100,
  padding: 12,
  railWidth: 64,
  margin: 0,
  gap: 0,
  aiWidth: preferred,
  sidebarMax: 480,
};

function historicalMax(aiWidth: number) {
  return Math.max(0, Math.min(480, metrics.stageWidth - metrics.padding - metrics.railWidth - aiWidth - metrics.margin - metrics.gap - 360));
}

export default function run() {
  const checker = createChecker();
  const shared = sidebarSharedWidth(metrics);
  const oldMax = resolveSidebarMaxWidth({ ...metrics, reserveAiWidth: true });
  const yieldedMax = resolveSidebarMaxWidth({ ...metrics, reserveAiWidth: false });
  checker.check("沿用 AI 面板最小宽度 320", PANEL_WIDTH_MIN === 320);
  checker.check("沿用正文预留 360", SIDEBAR_EDITOR_RESERVE === 360 && oldMax === historicalMax(preferred));
  checker.check(
    "AI 关着时侧栏上限与原来相同",
    resolveSidebarMaxWidth({ ...metrics, aiWidth: 0, reserveAiWidth: false }) === historicalMax(0),
  );
  checker.check(
    "设置页仍按 AI 当前宽度限制侧栏",
    resolveSidebarMaxWidth({ ...metrics, reserveAiWidth: true }) === historicalMax(preferred),
  );
  checker.check(
    "AI 打开时侧栏可以继续拖进面板占用的宽度",
    yieldedMax === historicalMax(0) && yieldedMax > oldMax,
  );

  const atOldMax = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: oldMax,
    sharedWidth: shared,
  });
  const shrunk = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: oldMax + 40,
    sharedWidth: shared,
  });
  checker.check("刚到原来的侧栏上限时 AI 保持原宽", atOldMax.hidden === false && atOldMax.width == null);
  checker.check(
    "再拖宽 40 像素时 AI 同步收窄 40",
    shrunk.hidden === false && shrunk.width === preferred - 40,
  );

  const hideSidebar = shared - PANEL_WIDTH_MIN - SIDEBAR_EDITOR_RESERVE;
  const atMin = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: hideSidebar,
    sharedWidth: shared,
  });
  const pastMin = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: hideSidebar + 1,
    sharedWidth: shared,
  });
  checker.check("收到最小宽度时仍然显示", atMin.hidden === false && atMin.width === PANEL_WIDTH_MIN);
  checker.check("再窄 1 像素就藏起 AI", pastMin.hidden === true && pastMin.width == null);
  checker.check(
    "藏起阈值就是已有的 320，不是新造的尺寸",
    pastMin.hidden === true && hideSidebar + 1 - oldMax === preferred - PANEL_WIDTH_MIN + 1,
  );

  const suspended = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: hideSidebar + 1,
    sharedWidth: shared,
    suspendHide: true,
  });
  checker.check("用户刚打开时先停在最小宽度，不立刻藏起", suspended.hidden === false && suspended.width === PANEL_WIDTH_MIN);

  const closed = resolveSidebarAiSqueeze({
    aiOpen: false,
    preferredAiWidth: preferred,
    sidebarWidth: hideSidebar + 80,
    sharedWidth: shared,
  });
  checker.check("AI 本来关着时拖侧栏不改面板", closed.hidden === false && closed.width == null);

  const widened = resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth: oldMax,
    sharedWidth: shared,
  });
  checker.check("侧栏拖回去后 AI 恢复到保存的宽度", widened.hidden === false && widened.width == null);

  const root = process.cwd();
  const hook = readFileSync(path.join(root, "src/pages/workspace/components/sidebar/sidebar-shell/useSidebarAvailableWidth.ts"), "utf8");
  const layout = readFileSync(path.join(root, "src/pages/workspace/components/sidebar/sidebar-shell/useSidebarLayout.tsx"), "utf8");
  checker.check(
    "侧栏上限改为让位计算，不再把 AI 当前宽度算进占位",
    hook.includes("sidebarMaxFromStage") && !hook.includes("getBoundingClientRect().width ?? 0) +"),
  );
  checker.check(
    "拖动预览里同步改 AI 宽度",
    layout.includes("syncSidebarAiSqueeze"),
  );
  return checker.failed;
}
