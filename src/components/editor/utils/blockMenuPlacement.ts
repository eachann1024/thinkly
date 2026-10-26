type Bounds = Pick<DOMRect, "left" | "right" | "top" | "bottom">;

export const BLOCK_MENU_PADDING = 24;
export const BLOCK_MENU_GAP = 6;
const MAX_HEIGHT = 384;

export function getBlockMenuWindowBounds() {
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
}

function paddedAxis(start: number, end: number, viewport: number) {
  const visibleStart = Math.max(0, Math.min(start, Math.max(0, viewport - 1)));
  const visibleEnd = Math.max(visibleStart + 1, Math.min(viewport, end));
  const padding = Math.min(BLOCK_MENU_PADDING, (visibleEnd - visibleStart - 1) / 2);
  return { start: visibleStart + padding, end: visibleEnd - padding };
}

function menuBounds(bounds: Bounds) {
  const horizontal = paddedAxis(bounds.left, bounds.right, window.innerWidth);
  const vertical = paddedAxis(bounds.top, bounds.bottom, window.innerHeight);
  return { left: horizontal.start, right: horizontal.end, top: vertical.start, bottom: vertical.end };
}

export function getBlockMenuPlacement(bounds: Bounds, trigger: Bounds, preferredWidth: number, contentHeight = MAX_HEIGHT) {
  const { left, right, top, bottom } = menuBounds(bounds);
  const triggerLeft = Math.max(left, Math.min(trigger.left, right));
  const triggerRight = Math.max(triggerLeft, Math.min(trigger.right, right));
  const leftSpace = Math.max(0, triggerLeft - BLOCK_MENU_GAP - left);
  const rightSpace = Math.max(0, right - triggerRight - BLOCK_MENU_GAP);
  const side: "left" | "right" = leftSpace >= preferredWidth || leftSpace >= rightSpace ? "left" : "right";
  const width = Math.max(1, Math.min(preferredWidth, side === "left" ? leftSpace : rightSpace));
  const minimumHeight = Math.min(160, Math.max(1, contentHeight), bottom - top);
  const menuTop = Math.max(top, Math.min(trigger.top, bottom - minimumHeight));
  return {
    side,
    left: Math.max(left, Math.min(side === "left" ? triggerLeft - BLOCK_MENU_GAP - width : triggerRight + BLOCK_MENU_GAP, right - width)),
    top: menuTop,
    width,
    maxHeight: Math.max(1, Math.min(MAX_HEIGHT, bottom - menuTop)),
  };
}

export function getBlockSubmenuPlacement(bounds: Bounds, parent: Bounds, item: Bounds, preferredWidth: number): {
  side: "left" | "right" | "bottom"; width: number; left: number; top: number; maxHeight: number;
} {
  const { left, right, top, bottom } = menuBounds(bounds);
  const parentLeft = Math.max(left, Math.min(parent.left, right));
  const parentRight = Math.max(parentLeft, Math.min(parent.right, right));
  const width = Math.min(preferredWidth, right - left);
  const side = parentLeft - BLOCK_MENU_GAP - left >= width ? "left"
    : right - parentRight - BLOCK_MENU_GAP >= width ? "right" : "bottom";
  if (side !== "bottom") {
    const menuTop = Math.max(top, Math.min(item.top, bottom - Math.min(160, bottom - top)));
    return { side, width, left: side === "left" ? parentLeft - BLOCK_MENU_GAP - width : parentRight + BLOCK_MENU_GAP,
      top: menuTop, maxHeight: Math.min(MAX_HEIGHT, bottom - menuTop) };
  }
  const below = Math.max(0, bottom - Math.max(top, item.bottom));
  const above = Math.max(0, Math.min(bottom, item.top) - top);
  const placeBelow = below >= Math.min(240, above);
  const maxHeight = Math.max(1, Math.min(MAX_HEIGHT, placeBelow ? below : above));
  return { side, width, left: Math.max(left, Math.min(parentLeft, right - width)),
    top: placeBelow ? Math.max(top, Math.min(item.bottom, bottom - maxHeight)) : Math.max(top, Math.min(item.top, bottom) - maxHeight), maxHeight };
}
