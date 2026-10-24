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

type LineBox = { left: number; right: number; top: number; bottom: number };

function wrappedLineBoxes(
  rects: Iterable<Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">>,
): LineBox[] {
  const lines: LineBox[] = [];
  for (const rect of rects) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    const line = lines.find(
      (item) => rect.top < item.bottom - 0.5 && rect.bottom > item.top + 0.5,
    );
    if (!line) {
      lines.push({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      });
      continue;
    }
    line.left = Math.min(line.left, rect.left);
    line.right = Math.max(line.right, rect.right);
    line.top = Math.min(line.top, rect.top);
    line.bottom = Math.max(line.bottom, rect.bottom);
  }
  lines.sort((a, b) => a.top - b.top || a.left - b.left);
  return lines;
}

function hitsWrappedText(
  rects: Iterable<Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">>,
  bounds: Pick<DOMRect, "top" | "bottom">,
  x: number,
  y: number,
): boolean {
  const lines = wrappedLineBoxes(rects);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const previous = lines[index - 1];
    const next = lines[index + 1];
    const top = previous ? (previous.bottom + line.top) / 2 : Math.min(line.top, bounds.top);
    const bottom = next ? (line.bottom + next.top) / 2 : Math.max(line.bottom, bounds.bottom);
    if (x >= line.left && x <= line.right && y >= top && y <= bottom) return true;
  }
  return false;
}

const HEAVY_CHILD_COUNT = 48;
const HEAVY_TEXT_CHARS = 4000;
const lineCache = new WeakMap<HTMLElement, { width: number; height: number; lines: LineBox[] }>();

function heavyInline(inline: HTMLElement): boolean {
  if (inline.childNodes.length > HEAVY_CHILD_COUNT) return true;
  const first = inline.firstChild;
  return first?.nodeType === Node.TEXT_NODE && (first.textContent?.length ?? 0) > HEAVY_TEXT_CHARS;
}

function relativeLines(
  inline: HTMLElement,
  bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
): LineBox[] {
  const cached = lineCache.get(inline);
  if (cached && cached.width === bounds.width && cached.height === bounds.height) return cached.lines;
  if (inline.childNodes.length > HEAVY_CHILD_COUNT) {
    lineCache.set(inline, { width: bounds.width, height: bounds.height, lines: [] });
    return [];
  }
  const range = document.createRange();
  range.selectNodeContents(inline);
  if (!range.toString().trim()) {
    lineCache.set(inline, { width: bounds.width, height: bounds.height, lines: [] });
    return [];
  }
  const lines = wrappedLineBoxes(range.getClientRects()).map((line) => ({
    left: line.left - bounds.left,
    right: line.right - bounds.left,
    top: line.top - bounds.top,
    bottom: line.bottom - bounds.top,
  }));
  lineCache.set(inline, { width: bounds.width, height: bounds.height, lines });
  return lines;
}

export function isPointerOverBlockContent(content: HTMLElement, x: number, y: number): boolean {
  const inline = content.querySelector<HTMLElement>(".bn-inline-content");
  if (!inline) return isPointerInRects([content.getBoundingClientRect()], x, y);
  const bounds = inline.getBoundingClientRect();
  if (content.dataset.contentType === "paragraph" && !inline.textContent) {
    return isPointerInRects([bounds], x, y);
  }
  if (heavyInline(inline)) {
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) return true;
  } else {
    const lines = relativeLines(inline, bounds);
    if (
      lines.length > 0 &&
      hitsWrappedText(
        lines.map((line) => ({
          left: bounds.left + line.left,
          right: bounds.left + line.right,
          top: bounds.top + line.top,
          bottom: bounds.top + line.bottom,
          width: line.right - line.left,
          height: line.bottom - line.top,
        })),
        bounds,
        x,
        y,
      )
    ) {
      return true;
    }
  }
  return isPointerInRects(
    Array.from(content.querySelectorAll("input, img, video, canvas"), (element) => element.getBoundingClientRect()),
    x,
    y,
  );
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
