export const SIDE_MENU_CONTENT_GAP = 6;

export const HEADING_SIDE_MENU_EXTRA_GAP = 8;

export const TABLE_SIDE_MENU_INSET = 9;

const TABLE_CHROME_REACH = 30;

export function tableSideMenuWidth(scale: number): number {
  return (22 * 2 + 2 + 8 + 4) * scale;
}

export function isPointerInTableChromeReach(
  table: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  x: number,
  y: number,
  scale = 1,
): boolean {
  const reach = TABLE_CHROME_REACH * scale;
  if (
    x >= table.left - reach &&
    x <= table.right + reach &&
    y >= table.top - reach &&
    y <= table.bottom + reach
  ) {
    return true;
  }
  const menuTop = table.top - (16 * scale + 4) - ((24 + 6) * scale) / 2 - 4 * scale;
  if (x < table.left - SIDE_MENU_CONTENT_GAP - tableSideMenuWidth(scale)) return false;
  if (x > table.left) return false;
  if (y < menuTop) return false;
  if (y > table.top + reach) return false;
  return true;
}

export function isPointerInRects(
  rects: Iterable<Pick<DOMRect, "left" | "right" | "top" | "bottom">>,
  x: number,
  y: number,
): boolean {
  return Array.from(rects).some((rect) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
  );
}

export function isPointerOverBlockContent(content: HTMLElement, x: number, y: number): boolean {
  return isPointerInRects([content.getBoundingClientRect()], x, y);
}

const EDITOR_SIDE_MENU_HOVER_SELECTOR = [
  ".bn-editor",
  ".bn-side-menu",
  ".bn-table-handle",
  ".bn-table-cell-handle",
  ".goose-table-handle-btn",
  ".goose-table-extend-button",
].join(", ");

function asClosestHost(
  target: EventTarget | null,
): Pick<Element, "closest"> | null {
  if (typeof target !== "object" || target === null) return null;
  if ("closest" in target && typeof target.closest === "function") {
    return target as Pick<Element, "closest">;
  }
  const parent =
    "parentElement" in target
      ? (target.parentElement as Pick<Element, "closest"> | null)
      : null;
  if (parent && typeof parent.closest === "function") return parent;
  return null;
}

export function isEditorSideMenuHoverTarget(
  target: EventTarget | null,
): boolean {
  return Boolean(
    asClosestHost(target)?.closest(EDITOR_SIDE_MENU_HOVER_SELECTOR),
  );
}

const TABLE_SIDE_MENU_UI_SELECTOR = [
  ".bn-side-menu",
  ".bn-table-handle",
  ".bn-table-cell-handle",
  ".goose-table-handle-btn",
  ".goose-table-extend-button",
].join(", ");

export function isTableSideMenuUiTarget(target: EventTarget | null): boolean {
  return Boolean(
    asClosestHost(target)?.closest(TABLE_SIDE_MENU_UI_SELECTOR),
  );
}

type SideMenuCorridorRect = {
  left: number;
  top: number;
  height: number;
};

export function isPointerInSideMenuCorridor(
  clientX: number,
  clientY: number,
  referencePos: SideMenuCorridorRect | undefined,
  gap: number,
  inset = 0,
): boolean {
  if (!referencePos || gap <= 0) return false;
  const right = referencePos.left + inset;
  const left = referencePos.left - gap;
  const top = referencePos.top;
  const bottom = referencePos.top + referencePos.height;
  return (
    clientX >= left &&
    clientX <= right &&
    clientY >= top &&
    clientY <= bottom
  );
}
