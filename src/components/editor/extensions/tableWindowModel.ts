/** 大表只挂视口内的行。选区锚点单独钉住，避免把中间几千行一起实体化。 */
export const TABLE_WINDOW_THRESHOLD = 64;
export const TABLE_VIEWPORT_ROWS = 28;
export const TABLE_OVERSCAN_ROWS = 24;

export type RowWindow = { start: number; end: number; pins: number[] };

export function tableUsesWindow(rowCount: number, spans: boolean): boolean {
  return !spans && rowCount >= TABLE_WINDOW_THRESHOLD;
}

export function initialRowWindow(rowCount: number): RowWindow {
  return {
    start: 0,
    end: Math.min(rowCount, TABLE_VIEWPORT_ROWS + TABLE_OVERSCAN_ROWS),
    pins: [],
  };
}

export function rowWindowAround(rowCount: number, scrollStart: number, pins: number[]): RowWindow {
  const span = TABLE_VIEWPORT_ROWS + TABLE_OVERSCAN_ROWS * 2;
  const start = Math.max(0, Math.min(scrollStart, Math.max(0, rowCount - 1)) - TABLE_OVERSCAN_ROWS);
  return { start, end: Math.min(rowCount, start + span), pins };
}

export function rowIsLive(
  index: number,
  rowCount: number,
  window: RowWindow | null,
  spans: boolean,
): boolean {
  if (!tableUsesWindow(rowCount, spans) || !window) return true;
  if (index >= window.start && index < window.end) return true;
  for (const pin of window.pins) {
    if (index >= pin - 1 && index <= pin + 1) return true;
  }
  return false;
}

export function liveRowCount(rowCount: number, window: RowWindow | null, spans: boolean): number {
  if (!tableUsesWindow(rowCount, spans) || !window) return rowCount;
  let count = 0;
  for (let index = 0; index < rowCount; index += 1) {
    if (rowIsLive(index, rowCount, window, spans)) count += 1;
  }
  return count;
}

/** 单块删除才做视图过渡。整页替换、大表删除、长文档都不截图。 */
export function shouldAnimateBlockRemoval(input: {
  docChanged: boolean;
  history: boolean;
  stepCount: number;
  removed: number;
  inserted: number;
  rootBlocks: number;
}): boolean {
  if (!input.docChanged || !input.history) return false;
  if (input.stepCount !== 1 || input.rootBlocks > 48) return false;
  const shrunk = input.removed - input.inserted;
  return shrunk >= 2 && input.removed <= 300 && input.inserted < 40;
}
