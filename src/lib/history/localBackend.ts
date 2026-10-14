import type { HistoryBackend } from "./backend";
import type { HistoryIndex } from "./types";
import { normalizeHistoryIndex } from "./guards";
import { parseHistoryVersion, invalidateHistoryVersion } from "./versionReadCache";
import { historyHash } from "./localPaths";
import { bindHistoryLocation, historyDiskOperation, readHistoryLocations, rendererHistoryDisk, writeHistoryJson } from "./localDisk";

export function makeLocalFolderHistoryBackend(basePath: string, relativePath: (pageId: string) => string | null): HistoryBackend {
  async function operation<T>(pageId: string, run: (directory: string, fs: NonNullable<ReturnType<typeof rendererHistoryDisk>>) => Promise<T>, unavailable: T) {
    const fs = rendererHistoryDisk();
    if (!fs) return unavailable;
    return historyDiskOperation(basePath, async () => run(await bindHistoryLocation(basePath, pageId, relativePath(pageId), fs), fs));
  }
  const file = (directory: string, id: string, version: string) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(version)) throw new Error("历史版本标识无效");
    return `${directory}/${historyHash(id)}.${version}.json`;
  };
  return {
    loadIndex(pageId) {
      return operation(pageId, async (directory, fs) => {
        const path = file(directory, pageId, "index");
        const text = await fs.exists(path) ? await fs.readFile(path) : null;
        const data = text ? JSON.parse(text) as HistoryIndex : null;
        if (data && data.pageId !== pageId) throw new Error("历史索引标识不一致");
        return normalizeHistoryIndex(data, pageId);
      }, { pageId, versions: [], lastVersionCharCount: 0 });
    },
    saveIndex(index) {
      return operation(index.pageId, async (directory, fs) => {
        await writeHistoryJson(file(directory, index.pageId, "index"), { ...index, relativePath: directory.slice(`${basePath}/.goose/history/`.length) }, fs);
      }, undefined);
    },
    loadVersion(pageId, versionId) {
      return operation(pageId, async (directory, fs) => {
        const path = file(directory, pageId, versionId);
        return parseHistoryVersion(path, await fs.exists(path) ? await fs.readFile(path) : null, pageId, versionId);
      }, null);
    },
    saveVersion(version) {
      return operation(version.pageId, async (directory, fs) => {
        const path = file(directory, version.pageId, version.versionId);
        invalidateHistoryVersion(path);
        await writeHistoryJson(path, { ...version, relativePath: directory.slice(`${basePath}/.goose/history/`.length) }, fs);
      }, undefined);
    },
    removeVersion(pageId, versionId) {
      return operation(pageId, async (directory, fs) => {
        const path = file(directory, pageId, versionId);
        invalidateHistoryVersion(path);
        if (await fs.exists(path) && !await fs.deleteFile(path)) throw new Error("无法清除历史版本");
      }, undefined);
    },
    dropAll(pageId) {
      return operation(pageId, async (directory, fs) => {
        for (const entry of await fs.readDir(directory)) {
          if (!entry.isFile || !entry.name.startsWith(`${historyHash(pageId)}.`)) continue;
          const path = `${directory}/${entry.name}`;
          invalidateHistoryVersion(path);
          if (!await fs.deleteFile(path)) throw new Error("无法永久清除历史记录");
        }
        const locations = await readHistoryLocations(basePath, fs);
        delete locations.pages[pageId];
        await writeHistoryJson(`${basePath}/.goose/history-map.json`, locations, fs);
      }, undefined);
    },
  };
}
