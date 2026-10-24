
export const WORKSPACE_MIN_WINDOW_WIDTH = 500;
export const WORKSPACE_MIN_WINDOW_HEIGHT = 560;

export const WORKSPACE_MIN_MAIN_WIDTH = WORKSPACE_MIN_WINDOW_WIDTH;

export const WORKSPACE_COLLAPSE_RIGHT_BELOW = 1100;

export const WORKSPACE_COLLAPSE_LEFT_BELOW = 720;

export type WorkspaceViewportCollapse = {
  forceCollapseLeft: boolean;
  forceCollapseRight: boolean;
};

export function computeWorkspaceViewportCollapse(
  windowWidth: number,
): WorkspaceViewportCollapse {
  const width = Number.isFinite(windowWidth) ? windowWidth : 0;
  return {
    forceCollapseLeft: width < WORKSPACE_COLLAPSE_LEFT_BELOW,
    forceCollapseRight: width < WORKSPACE_COLLAPSE_RIGHT_BELOW,
  };
}

export function isEffectiveSidebarCollapsed(
  userCollapsed: boolean,
  forceCollapse: boolean,
  expandOverride: boolean,
): boolean {
  if (expandOverride) return false;
  return userCollapsed || forceCollapse;
}

export function isEffectiveRightSidePanelOpen(
  userOpen: boolean,
  forceCollapse: boolean,
  expandOverride: boolean,
): boolean {
  if (!userOpen) return false;
  if (expandOverride) return true;
  return !forceCollapse;
}
