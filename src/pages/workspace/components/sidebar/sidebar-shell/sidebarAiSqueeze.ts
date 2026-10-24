import { create } from "zustand";
import { PANEL_WIDTH_MIN, readPreferredPanelWidth } from "../../notebook-ai/usePanelWidth";
import { isSidebarResizeDrag, SIDEBAR_MAX_WIDTH } from "../hooks/useSidebarResize";

/** 侧栏拖宽时留给正文的宽度，与原先侧栏上限里的 360 预留相同。 */
export const SIDEBAR_EDITOR_RESERVE = 360;

export type SidebarAiFit = {
  hidden: boolean;
  /** 展示宽度上限。null 表示沿用用户保存的面板宽度。 */
  width: number | null;
};

type StageMetrics = {
  stageWidth: number;
  padding: number;
  railWidth: number;
  margin: number;
  gap: number;
  aiWidth: number;
  settings: boolean;
  overlay: boolean;
  collapsed: boolean;
};

type SqueezeState = SidebarAiFit & {
  requested: boolean;
};

const live: SidebarAiFit = { hidden: false, width: null };
let hideSuspended = false;

export const useSidebarAiSqueeze = create<SqueezeState>(() => ({
  requested: false,
  hidden: false,
  width: null,
}));

export function readSidebarAiLiveWidth(): number | null {
  return live.width;
}

/** 用户刚打开 AI 时，先显示到最小宽度，等下一次拖侧栏再允许藏起。 */
export function noteSidebarAiOpenedByUser() {
  hideSuspended = true;
}

export function revealSqueezedAiPanel() {
  hideSuspended = true;
  resyncSidebarAiSqueeze({ keepSuspend: true });
}

export function setSidebarAiRequested(requested: boolean) {
  const current = useSidebarAiSqueeze.getState();
  if (current.requested === requested) return;
  if (!requested) {
    hideSuspended = false;
    live.hidden = false;
    live.width = null;
    useSidebarAiSqueeze.setState({ requested: false, hidden: false, width: null });
    return;
  }
  useSidebarAiSqueeze.setState({ requested: true });
}

/**
 * 侧栏变宽时，多出来的宽度从 AI 面板扣。
 * 扣到 PANEL_WIDTH_MIN 仍放不下正文预留，就藏起面板。AI 本来关着则不改。
 */
export function resolveSidebarAiSqueeze(input: {
  aiOpen: boolean;
  preferredAiWidth: number;
  sidebarWidth: number;
  sharedWidth: number;
  suspendHide?: boolean;
}): SidebarAiFit {
  if (!input.aiOpen) return { hidden: false, width: null };
  if (!Number.isFinite(input.sidebarWidth) || !Number.isFinite(input.sharedWidth)) {
    return { hidden: false, width: null };
  }
  const room = input.sharedWidth - input.sidebarWidth - SIDEBAR_EDITOR_RESERVE;
  if (room >= input.preferredAiWidth) return { hidden: false, width: null };
  if (room < PANEL_WIDTH_MIN) {
    if (input.suspendHide) return { hidden: false, width: PANEL_WIDTH_MIN };
    return { hidden: true, width: null };
  }
  return { hidden: false, width: room };
}

/** 设置页仍按 AI 当前宽度占位；工作区里 AI 打开时让出这段宽度。 */
export function resolveSidebarMaxWidth(input: {
  stageWidth: number;
  padding: number;
  railWidth: number;
  margin: number;
  gap: number;
  aiWidth: number;
  reserveAiWidth: boolean;
  sidebarMax?: number;
}): number {
  const occupied = input.railWidth
    + (input.reserveAiWidth ? input.aiWidth : 0)
    + input.margin
    + input.gap;
  const room = input.stageWidth - input.padding - occupied - SIDEBAR_EDITOR_RESERVE;
  return Math.max(0, Math.min(input.sidebarMax ?? SIDEBAR_MAX_WIDTH, room));
}

export function sidebarSharedWidth(input: {
  stageWidth: number;
  padding: number;
  railWidth: number;
  margin: number;
  gap: number;
}): number {
  return input.stageWidth - input.padding - input.railWidth - input.margin - input.gap;
}

function readStageMetrics(stage: HTMLElement): StageMetrics {
  const style = getComputedStyle(stage);
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const rail = stage.querySelector<HTMLElement>(":scope > .sidebar-rail-shell");
  const main = stage.querySelector<HTMLElement>(":scope > .workspace-main-sheet");
  const columns = main?.querySelector<HTMLElement>(".workspace-content-columns");
  const ai = stage.querySelector<HTMLElement>('[data-ai-panel-layout="side-panel"]');
  const mainStyle = main ? getComputedStyle(main) : null;
  const margin = mainStyle ? parseFloat(mainStyle.marginLeft) + parseFloat(mainStyle.marginRight) : 0;
  const gap = ai && columns ? parseFloat(getComputedStyle(columns).columnGap) || 0 : 0;
  const shell = stage.closest(".workspace-shell");
  return {
    stageWidth: stage.clientWidth,
    padding,
    railWidth: rail?.getBoundingClientRect().width ?? 0,
    margin,
    gap,
    aiWidth: ai?.getBoundingClientRect().width ?? 0,
    settings: shell instanceof HTMLElement && shell.hasAttribute("data-settings"),
    overlay: stage.hasAttribute("data-sidebar-overlay"),
    collapsed: stage.hasAttribute("data-sidebar-collapsed"),
  };
}

export function sidebarMaxFromStage(stage: HTMLElement): number {
  const metrics = readStageMetrics(stage);
  return resolveSidebarMaxWidth({ ...metrics, reserveAiWidth: metrics.settings });
}

function widthsEqual(left: number | null, right: number | null) {
  if (left == null || right == null) return left === right;
  return Math.abs(left - right) < 0.5;
}

function publish(next: SidebarAiFit): SidebarAiFit {
  const fit = {
    hidden: next.hidden,
    width: next.width == null ? null : Math.round(next.width),
  };
  live.hidden = fit.hidden;
  live.width = fit.width;
  const current = useSidebarAiSqueeze.getState();
  const same = fit.hidden === current.hidden && widthsEqual(fit.width, current.width);
  if (isSidebarResizeDrag() && fit.hidden === current.hidden) return fit;
  if (!same) useSidebarAiSqueeze.setState(fit);
  return fit;
}

function applyAiPanelDom(stage: HTMLElement, fit: SidebarAiFit, preferred: number) {
  const shell = stage.closest<HTMLElement>(".workspace-shell");
  const panel = stage.querySelector<HTMLElement>('[data-ai-panel-layout="side-panel"]');
  if (!shell) return;
  if (fit.hidden) {
    if (panel && !panel.hasAttribute("data-ai-squeezed-hidden")) {
      panel.setAttribute("data-ai-squeezed-hidden", "");
    }
    if (shell.style.getPropertyValue("--workspace-ai-width").trim() !== "0px") {
      shell.style.setProperty("--workspace-ai-width", "0px");
    }
    return;
  }
  panel?.removeAttribute("data-ai-squeezed-hidden");
  const px = `${Math.round(fit.width ?? preferred)}px`;
  if (panel && panel.style.width !== px) panel.style.width = px;
  if (shell.style.getPropertyValue("--workspace-ai-width").trim() !== px) {
    shell.style.setProperty("--workspace-ai-width", px);
  }
}

export function syncSidebarAiSqueeze(
  sidebar: HTMLElement,
  sidebarWidth: number,
  options?: { keepSuspend?: boolean },
) {
  if (!options?.keepSuspend) hideSuspended = false;
  const stage = sidebar.closest<HTMLElement>(".workspace-stage");
  if (!stage) return;
  const metrics = readStageMetrics(stage);
  const idle = metrics.settings || metrics.overlay || metrics.collapsed
    || !useSidebarAiSqueeze.getState().requested;
  if (idle) {
    publish({ hidden: false, width: null });
    stage.querySelector<HTMLElement>('[data-ai-panel-layout="side-panel"]')
      ?.removeAttribute("data-ai-squeezed-hidden");
    return;
  }
  const preferred = readPreferredPanelWidth();
  const fit = publish(resolveSidebarAiSqueeze({
    aiOpen: true,
    preferredAiWidth: preferred,
    sidebarWidth,
    sharedWidth: sidebarSharedWidth(metrics),
    suspendHide: hideSuspended,
  }));
  applyAiPanelDom(stage, fit, preferred);
}

export function resyncSidebarAiSqueeze(options?: { keepSuspend?: boolean }) {
  const sidebar = document.querySelector<HTMLElement>(".workspace-stage > .workspace-sidebar-pane");
  if (!sidebar) return;
  const raw = sidebar.style.getPropertyValue("--sidebar-configured-width");
  const parsed = Number.parseFloat(raw);
  const sidebarWidth = Number.isFinite(parsed) ? parsed : sidebar.getBoundingClientRect().width;
  syncSidebarAiSqueeze(sidebar, sidebarWidth, options);
}
