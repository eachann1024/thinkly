import type { HistoryDisk } from "./localDisk";

export const HISTORY_LAYOUT = 2;

/** 迁移完成后在 notebook.json 记下 historyLayout；id 与其他字段原样保留。 */
export async function markHistoryLayout(basePath: string, fs: HistoryDisk): Promise<void> {
  const file = `${basePath}/.goose/notebook.json`;
  if (!await fs.exists(file)) return;
  const text = await fs.readFile(file);
  if (!text) return;
  let marker: Record<string, unknown>;
  try { marker = JSON.parse(text); } catch { return; }
  if (!marker || typeof marker.id !== "string" || marker.historyLayout === HISTORY_LAYOUT) return;
  await fs.writeFile(file, `${JSON.stringify({ ...marker, historyLayout: HISTORY_LAYOUT })}\n`);
}
