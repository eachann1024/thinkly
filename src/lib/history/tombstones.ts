import { readDbStorageJSON, writeDbStorageJSON } from "../storage/localDbStorage";

/**
 * 本机墓碑：笔记文件消失后只记 `{notebookId, pageId, deletedAt}`，历史延迟清理。
 * 存在本机 localStorage（与 gn:local-idmap 同一存储），不写入笔记本目录，因此不会被同步。
 */
const KEY = "gn:history-tombstones";
export const HISTORY_TOMBSTONE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type Tombstones = Record<string, Record<string, number>>;

const read = () => readDbStorageJSON<Tombstones>(KEY, {});

export function listHistoryTombstones(notebookId: string): Record<string, number> {
  return read()[notebookId] ?? {};
}

export function recordHistoryTombstones(notebookId: string, pageIds: Iterable<string>, deletedAt = Date.now()): void {
  const all = read();
  const book = all[notebookId] ?? {};
  let changed = false;
  for (const id of pageIds) if (book[id] === undefined) { book[id] = deletedAt; changed = true; }
  if (!changed) return;
  all[notebookId] = book;
  writeDbStorageJSON(KEY, all);
}

export function clearHistoryTombstones(notebookId: string, pageIds: Iterable<string>): void {
  const all = read();
  const book = all[notebookId];
  if (!book) return;
  let changed = false;
  for (const id of pageIds) if (book[id] !== undefined) { delete book[id]; changed = true; }
  if (!changed) return;
  if (Object.keys(book).length === 0) delete all[notebookId];
  writeDbStorageJSON(KEY, all);
}
