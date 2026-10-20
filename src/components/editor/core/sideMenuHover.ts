/** 侧栏 pill 右缘与内容列左缘的间距（px） */
export const SIDE_MENU_CONTENT_GAP = 6;

/** 标题盒子左右外扩 8px。普通块当前行底也外扩同样距离，
 *  把手统一再左移这么多，和标题把手对齐、避免压住色条。 */
export const HEADING_SIDE_MENU_EXTRA_GAP = 8;

/**
 * 表格 tableWrapper 左侧为行把手留的 padding（BlockNote `--bn-table-handle-size`）。
 * 视觉上表格边框比内容列左缘更靠右，从格子移向侧栏会先经过这段空白。
 */
export const TABLE_SIDE_MENU_INSET = 9;

/** 行/列把手伸出表格的距离：24px 按钮 + 4px 间距，再留 2px，避免缝里卸掉。 */
const TABLE_CHROME_REACH = 30;

/** 表格块把手没有折叠钮：两枚 22px 按钮、2px 间距、左右各 4px 内边距，再留 4px。 */
export function tableSideMenuWidth(scale: number): number {
  return (22 * 2 + 2 + 8 + 4) * scale;
}

/**
 * 行/列把手和块把手都画在表格边框外。标题和表格之间往往只有一行间距，
 * 指针移向左上角方块时会先落到标题上，于是把手先消失。
 * 边框外这一圈，以及左上角块把手所占的位置，仍算这张表。
 */
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

/** 同一行的文字碎片并成一条；行与行之间的半行距留到后面补。 */
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

/**
 * 行高大于字面时，Range 矩形之间有空隙。指针在段落里移动会反复离开这些空隙，把手跟着闪。
 * 空隙按中线分给相邻行；左右仍只用该行文字宽度，短行右侧空白不显示把手。
 */
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

/** 整行空白不算内容：只有文字、控件或媒体才显示把手。大块只量一次外框。 */
export function isPointerOverBlockContent(content: HTMLElement, x: number, y: number): boolean {
  const inline = content.querySelector<HTMLElement>(".bn-inline-content");
  if (!inline) return isPointerInRects([content.getBoundingClientRect()], x, y);
  const bounds = inline.getBoundingClientRect();
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

/**
 * BlockNote SideMenu 会在编辑器左右约 250px 内夹住 X 并弹出把手。
 * 左右 gutter 不属于编辑器，只有指针落在内容列或已出现的把手上才显示。
 */
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

/** 表格行/列把手是 portal，BlockNote 会把它们当成编辑器外并关掉 SideMenu.show */
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

/**
 * 内容列与侧栏之间的 gutter 不属于 `.bn-editor`。表格又比 pill 高，
 * 现有 `::after` 桥只跟 pill 同高，从某一行横移会先掉 hover。
 * 用块的完整高度做几何走廊，避免侧栏先卸掉。
 */
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
