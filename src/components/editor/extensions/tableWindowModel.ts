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
