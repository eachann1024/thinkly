import { historyText as uiText } from "./messages";

import type { HistoryBackend } from "./backend";
import { emptyHistoryMeta, findHistoryEntry, invalidatePortableIds, isSafeVersionId, withHistoryPath, writeHistoryMeta, type HistoryMeta } from "./layout";
import { ensureHistoryLayoutOnce } from "./legacyMigration";
import { historyDiskOperation, rendererHistoryDisk, writeHistoryJson, type HistoryDisk } from "./localDisk";
import { originalHistoryPath, validHistoryRelativePath } from "./localPaths";
import { invalidateHistoryVersion, parseHistoryVersion } from "./versionReadCache";

export function makeLocalFolderHistoryBackend(
  basePath: string,
  relativePath: (pageId: string) => string | null,
): HistoryBackend {
  function operation<T>(run: (fs: HistoryDisk) => Promise<T>, unavailable: T): Promise<T> {
    const fs = rendererHistoryDisk();
    if (!fs) return Promise.resolve(unavailable);
    return historyDiskOperation(basePath, async () => {
      await ensureHistoryLayoutOnce(basePath, fs);
      return run(fs);
    });
  }
  /** 定位页面的历史目录；笔记在笔记本内改名后，只刷新 meta.json 里的路径。 */
  async function locate(pageId: string, fs: HistoryDisk) {
    const found = await findHistoryEntry(basePath, pageId, fs);
    const current = relativePath(pageId);
    let meta = found.meta;
    if (meta && validHistoryRelativePath(current) && meta.relativePath !== current) {
      meta = withHistoryPath(meta, current);
      await writeHistoryMeta(basePath, found.dir, meta, fs);
    }
    return { dir: found.dir, meta, current: validHistoryRelativePath(current) ? current : (meta?.relativePath ?? originalHistoryPath(pageId)) };
  }
  const file = (dir: string, versionId: string) => {
    if (!isSafeVersionId(versionId)) throw new Error(uiText("invalidVersionHistoryIdentifier"));
    return `${dir}/${versionId}.json`;
  };
  return {
    loadIndex(pageId) {
      return operation(async (fs) => {
        const { dir, meta } = await locate(pageId, fs);
        const present = await Promise.all((meta?.versions ?? []).map(async (entry) => (await fs.exists(file(dir, entry.versionId))) ? entry : null));
        const versions = present
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
          .sort((a, b) => a.createdAt - b.createdAt || a.versionId.localeCompare(b.versionId));
        return { pageId, versions, lastVersionCharCount: versions.at(-1)?.charCount ?? 0 };
      }, { pageId, versions: [], lastVersionCharCount: 0 });
    },
    saveIndex(index) {
      return operation(async (fs) => {
        const { dir, meta, current } = await locate(index.pageId, fs);
        const next: HistoryMeta = { ...(meta ?? emptyHistoryMeta(index.pageId, current)), versions: index.versions, lastVersionCharCount: index.lastVersionCharCount };
        await writeHistoryMeta(basePath, dir, next, fs);
      }, undefined);
    },
    loadVersion(pageId, versionId) {
      return operation(async (fs) => {
        const { dir } = await locate(pageId, fs);
        const path = file(dir, versionId);
        return parseHistoryVersion(path, (await fs.exists(path)) ? await fs.readFile(path) : null, pageId, versionId);
      }, null);
    },
    saveVersion(version) {
      return operation(async (fs) => {
        const { dir, current } = await locate(version.pageId, fs);
        const path = file(dir, version.versionId);
        invalidateHistoryVersion(path);
        if (!await fs.exists(dir) && !await fs.mkdir(dir)) throw new Error(uiText("couldnTCreateTheDestinationHistoryFolder"));
        await writeHistoryJson(path, { ...version, relativePath: current ?? undefined }, fs);
      }, undefined);
    },
    removeVersion(pageId, versionId) {
      return operation(async (fs) => {
        const { dir } = await locate(pageId, fs);
        const path = file(dir, versionId);
        invalidateHistoryVersion(path);
        if ((await fs.exists(path)) && !(await fs.deleteFile(path))) throw new Error(uiText("couldnTClearVersionHistory"));
      }, undefined);
    },
    dropAll(pageId) {
      return operation(async (fs) => {
        const { dir, meta } = await locate(pageId, fs);
        if (!meta) return;
        for (const entry of meta.versions) invalidateHistoryVersion(file(dir, entry.versionId));
        if (!await fs.deleteDir(dir)) throw new Error(uiText("couldnTPermanentlyClearVersionHistory"));
        invalidatePortableIds(basePath);
      }, undefined);
    },
  };
}
