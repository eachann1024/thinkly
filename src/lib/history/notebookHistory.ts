import { ensureHistoryLayout, ensureHistoryLayoutOnce } from "./legacyMigration";
import { cachedPortableIds, findHistoryEntry, invalidatePortableIds, listHistoryEntries, rememberPortableIds, withHistoryPath, writeHistoryMeta } from "./layout";
import { historyDiskOperation, rendererHistoryDisk, type HistoryDisk } from "./localDisk";
import { validHistoryRelativePath } from "./localPaths";

const PORTABLE_TTL_MS = 20_000;

/** 应用内改名/移动后，把新路径写进各页面的 meta.json；历史目录本身不搬动。同时顺带迁移旧布局。 */
export async function migrateNotebookHistory(basePath: string, knownPaths: Record<string, string> = {}, provided?: HistoryDisk) {
  const fs = provided ?? rendererHistoryDisk();
  if (!fs) return;
  return historyDiskOperation(basePath, async () => {
    invalidatePortableIds(basePath);
    await ensureHistoryLayout(basePath, fs);
    for (const [pageId, path] of Object.entries(knownPaths)) {
      if (!validHistoryRelativePath(path)) continue;
      const { dir, meta } = await findHistoryEntry(basePath, pageId, fs);
      if (meta && meta.relativePath !== path) await writeHistoryMeta(basePath, dir, withHistoryPath(meta, path), fs);
    }
  });
}

/** 磁盘上仍存在的笔记路径 → 其历史所属 pageId，用于重开笔记本时沿用原 ID。 */
export async function portableHistoryIds(basePath: string): Promise<Record<string, string>> {
  const fs = rendererHistoryDisk();
  if (!fs) return {};
  const cached = cachedPortableIds(basePath);
  if (cached && Date.now() - cached.at < PORTABLE_TTL_MS) return cached.value;
  return historyDiskOperation(basePath, async () => {
    await ensureHistoryLayoutOnce(basePath, fs);
    const best: Record<string, { id: string; at: number }> = Object.create(null);
    for (const { meta } of await listHistoryEntries(basePath, fs)) {
      const path = meta.relativePath;
      const at = meta.versions.at(-1)?.createdAt;
      if (!path || at === undefined || (best[path] && best[path].at >= at)) continue;
      if (await fs.exists(`${basePath}/${path}`)) best[path] = { id: meta.pageId, at };
    }
    const value: Record<string, string> = Object.create(null);
    for (const [path, { id }] of Object.entries(best)) value[path] = id;
    rememberPortableIds(basePath, value);
    return value;
  });
}
