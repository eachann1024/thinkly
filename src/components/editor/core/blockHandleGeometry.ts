type Bounds = { left: number; right: number; top: number; bottom: number };

export function blockHandleLeft(preferredRight: number, width: number, viewport: Pick<Bounds, "left" | "right">): number {
  return Math.max(viewport.left + 4, Math.min(preferredRight - width, viewport.right - width - 4));
}

export function isPointerInToolbarCorridor(block: Bounds, toolbar: Bounds, x: number, y: number): boolean {
  if (toolbar.bottom <= block.top && block.top - toolbar.bottom <= 16) {
    return x >= toolbar.left - 4 && x <= toolbar.right + 4 && y >= toolbar.bottom && y <= block.top;
  }
  if (toolbar.top >= block.bottom && toolbar.top - block.bottom <= 16) {
    return x >= toolbar.left - 4 && x <= toolbar.right + 4 && y >= block.bottom && y <= toolbar.top;
  }
  return false;
}
