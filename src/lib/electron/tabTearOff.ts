
export type ScreenPoint = { x: number; y: number };

export type ScreenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DockSurface = {
  id: string;
  outerBounds: ScreenRect;
  contentBounds: ScreenRect;
};

export type TabDragResolution =
  | { action: "none" }
  | { action: "tearOff" }
  | { action: "dock"; targetWindowId: string; contentX: number };

export type TabRailRect = {
  left: number;
  width: number;
};

export const TEAR_OFF_MARGIN_PX = 24;

export const TAB_DOCK_SLOP_PX = 12;

export const DEFAULT_TEAR_OFF_GRAB_OFFSET_X = 80;

export function pointInRect(point: ScreenPoint, rect: ScreenRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function expandRect(rect: ScreenRect, margin: number): ScreenRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

export function dockHitRect(
  outer: ScreenRect,
  content: ScreenRect,
  titleBarHeight: number,
  slop = TAB_DOCK_SLOP_PX,
): ScreenRect {
  const top = Math.min(outer.y, content.y);
  const nativeChrome = Math.max(0, content.y - top);
  const height =
    nativeChrome + Math.max(0, titleBarHeight) + Math.max(0, slop);
  return {
    x: content.x,
    y: top,
    width: Math.max(0, content.width),
    height,
  };
}

export function resolveTabDrag(opts: {
  sourceWindowId: string;
  sourceTabCount: number;
  cursor: ScreenPoint;
  surfaces: DockSurface[];
  titleBarHeight: number;
}): TabDragResolution {
  const { sourceWindowId, sourceTabCount, cursor, surfaces, titleBarHeight } =
    opts;

  for (const surface of surfaces) {
    if (surface.id === sourceWindowId) continue;
    const hit = dockHitRect(
      surface.outerBounds,
      surface.contentBounds,
      titleBarHeight,
    );
    if (!pointInRect(cursor, hit)) continue;
    return {
      action: "dock",
      targetWindowId: surface.id,
      contentX: cursor.x - surface.contentBounds.x,
    };
  }

  const source = surfaces.find((surface) => surface.id === sourceWindowId);
  if (
    source &&
    pointInRect(cursor, expandRect(source.outerBounds, TEAR_OFF_MARGIN_PX))
  ) {
    return { action: "none" };
  }
  if (sourceTabCount >= 2) return { action: "tearOff" };
  return { action: "none" };
}

export function insertIndexFromTabRects(
  rects: TabRailRect[],
  pointerX: number,
): number {
  for (let i = 0; i < rects.length; i += 1) {
    const tab = rects[i];
    if (!tab) continue;
    if (pointerX < tab.left + tab.width / 2) return i;
  }
  return rects.length;
}

export function insertLineLeft(
  rects: TabRailRect[],
  insertIndex: number,
): number | null {
  if (rects.length === 0) return 0;
  if (insertIndex <= 0) return rects[0]?.left ?? 0;
  if (insertIndex >= rects.length) {
    const last = rects[rects.length - 1];
    if (!last) return 0;
    return last.left + last.width;
  }
  return rects[insertIndex]?.left ?? 0;
}

export function tearOffWindowBounds(opts: {
  cursor: ScreenPoint;
  source: ScreenRect;
  grabOffsetX?: number;
  titleBarHeight: number;
}): ScreenRect {
  const grab = Number.isFinite(opts.grabOffsetX)
    ? Math.max(0, opts.grabOffsetX as number)
    : DEFAULT_TEAR_OFF_GRAB_OFFSET_X;
  const titleBar = Math.max(8, opts.titleBarHeight / 2);
  return {
    x: opts.cursor.x - grab,
    y: opts.cursor.y - titleBar,
    width: opts.source.width,
    height: opts.source.height,
  };
}

export function canDragTabBetweenWindows(opts: {
  isElectron: boolean;
  variant: string;
}): boolean {
  return opts.isElectron && opts.variant === "electron-titlebar";
}

export function tabDragEnabled(opts: {
  isElectron: boolean;
  variant: string;
  tabCount: number;
}): boolean {
  return opts.tabCount >= 2;
}
