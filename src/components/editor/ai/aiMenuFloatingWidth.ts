export const AI_MENU_MIN_WIDTH_PX = 280;
export const AI_MENU_MAX_WIDTH_PX = 576;
export const AI_MENU_VIEWPORT_RATIO = 1;
export const AI_MENU_VIEWPORT_PAD_PX = 8;

export type AiMenuFloatingWidthInput = {
  viewportWidth: number;
  availableWidth: number;
  scale?: number;
  preferredWidth?: number;
};

export function computeAiMenuFloatingWidth({
  viewportWidth,
  availableWidth,
  scale = 1,
  preferredWidth = AI_MENU_MAX_WIDTH_PX * scale,
}: AiMenuFloatingWidthInput): number {
  const pad = AI_MENU_VIEWPORT_PAD_PX;
  const viewportCap = Math.max(0, viewportWidth - pad * 2);
  const desired = Math.min(
    viewportWidth * AI_MENU_VIEWPORT_RATIO,
    preferredWidth,
    viewportCap,
  );
  const available = availableWidth;
  const fitted = Math.min(
    desired,
    Number.isFinite(available) && available > 0 ? available : desired,
    viewportCap,
  );
  return Math.max(0, fitted);
}
