import { ensureHistoryLayout, ensureHistoryLayoutOnce } from "./legacyMigration";
import { cachedPortableIds, findHistoryEntry, invalidatePortableIds, listHistoryEntries, rememberPortableIds, withHistoryPath, writeHistoryMeta } from "./layout";
import { historyDiskOperation, rendererHistoryDisk, type HistoryDisk } from "./localDisk";
import { validHistoryRelativePath } from "./localPaths";

const PORTABLE_TTL_MS = 20_000;

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
  }).catch((error) => {
    // History is optional metadata: a protected .goose directory must not block notes.
    console.warn("[history] 无法读取历史索引，继续读取笔记", basePath, error);
    return {};
  });
}
