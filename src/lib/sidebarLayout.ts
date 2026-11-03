export const WORKSPACE_SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 480;

export function resolveSidebarWidth(
  saved: string | null,
  defaultWidth = SIDEBAR_MIN_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
) {
  const value = saved?.trim() ? Number(saved) : NaN;
  return Number.isFinite(value) && value > 0
    ? Math.max(minWidth, Math.min(SIDEBAR_MAX_WIDTH, value))
    : defaultWidth;
}

export function clampSidebarResizeWidth(
  width: number,
  maxWidth = SIDEBAR_MAX_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
) {
  return Math.max(Math.min(minWidth, maxWidth), Math.min(maxWidth, width));
}
