import type { SidebarView } from "./shared";

export type SidebarViewClickAction = "search" | "collapse" | "show";

export function sidebarViewClickAction(input: {
  view: SidebarView;
  alreadyShowing: boolean;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  inHistoryMode: boolean;
  preview: boolean;
  aiFullscreenOpen: boolean;
}): SidebarViewClickAction {
  if (input.view === "search") return "search";
  const collapse =
    !input.aiFullscreenOpen &&
    input.alreadyShowing &&
    !input.sidebarCollapsed &&
    !input.settingsOpen &&
    !input.inHistoryMode &&
    !input.preview;
  return collapse ? "collapse" : "show";
}

export function viewClickLeavesFullscreenAi(view: SidebarView): boolean {
  return view === "pages" || view === "outline";
}

export type AiToggleStep =
  | { type: "ignore" }
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" }
  | { type: "expand-right" }
  | { type: "set-right-override"; value: boolean };

export function aiToggleSteps(input: {
  available: boolean;
  settingsOpen: boolean;
  aiFullscreen: boolean;
  panelOpen: boolean;
  forceCollapseRight: boolean;
  rightExpandOverride: boolean;
}): AiToggleStep[] {
  if (!input.available) return [{ type: "ignore" }];
  if (input.settingsOpen) {
    const steps: AiToggleStep[] = [];
    if (!input.panelOpen) steps.push({ type: "open" });
    if (!input.aiFullscreen && input.forceCollapseRight) steps.push({ type: "expand-right" });
    return steps;
  }
  if (input.panelOpen && input.aiFullscreen) return [{ type: "close" }];
  if (!input.aiFullscreen && input.forceCollapseRight) {
    if (!input.panelOpen) return [{ type: "open" }, { type: "expand-right" }];
    return [{ type: "set-right-override", value: !input.rightExpandOverride }];
  }
  return [{ type: "toggle" }];
}
