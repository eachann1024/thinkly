import { historyHash, originalHistoryPath, parseHistoryLocations, validHistoryRelativePath, type HistoryLocations } from "./localPaths";

export interface HistoryDisk {
  readFile(path: string): string | null | Promise<string | null>;
  writeFile(path: string, text: string): boolean | Promise<boolean>;
  readDir(path: string): { name: string; path: string; isDirectory: boolean; isFile: boolean }[] | Promise<{ name: string; path: string; isDirectory: boolean; isFile: boolean }[]>;
  exists(path: string): boolean | Promise<boolean>;
  mkdir(path: string): boolean | Promise<boolean>;
  deleteFile(path: string): boolean | Promise<boolean>;
}

const queues = new Map<string, Promise<unknown>>();
export function historyDiskOperation<T>(basePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = queues.get(basePath) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  queues.set(basePath, next);
  void next.finally(() => { if (queues.get(basePath) === next) queues.delete(basePath); }).catch(() => {});
  return next;
}

export function rendererHistoryDisk(): HistoryDisk | null {
  if (typeof window === "undefined" || !window.gooseFs) return null;
  const fs = window.gooseFs;
  return {
    readFile: (path) => fs.readFileAsync ? fs.readFileAsync(path) : fs.readFile(path),
    writeFile: (path, text) => fs.writeFileAsync ? fs.writeFileAsync(path, text) : fs.writeFile(path, text),
    readDir: (path) => fs.readDirAsync ? fs.readDirAsync(path) : fs.readDir(path),
    exists: (path) => fs.existsAsync ? fs.existsAsync(path) : fs.exists(path),
    mkdir: (path) => fs.mkdir(path), deleteFile: (path) => fs.deleteFile(path),
  };
}

export async function readHistoryLocations(basePath: string, fs: HistoryDisk) {
  const file = `${basePath}/.goose/history-map.json`;
  return parseHistoryLocations(await fs.exists(file) ? await fs.readFile(file) : null);
}

async function ensureDirectory(basePath: string, relative: string, fs: HistoryDisk) {
  let directory = basePath;
  for (const part of relative.split("/")) {
    directory += `/${part}`;
    if (!await fs.exists(directory) && !await fs.mkdir(directory)) throw new Error(`无法创建历史目录：${directory}`);
  }
}

export async function writeHistoryJson(file: string, value: unknown, fs: HistoryDisk) {
  if (!await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n")) throw new Error(`无法保存历史文件：${file}`);
}

/** Copy and verify first; publish the new location before removing old copies. */
export async function bindHistoryLocation(basePath: string, pageId: string, relativePath: string | null, fs: HistoryDisk): Promise<string> {
  const locations = await readHistoryLocations(basePath, fs);
  const previous = locations.pages[pageId];
  const relative = relativePath ?? previous?.relativePath ?? originalHistoryPath(pageId) ?? `_未定位/${historyHash(pageId)}`;
  if (!validHistoryRelativePath(relative)) throw new Error("笔记历史路径无效");
  const directory = `${basePath}/.goose/history/${relative}`;
  await ensureDirectory(basePath, `.goose/history/${relative}`, fs);
  const sources = new Set([`${basePath}/.goose/history`, ...(previous ? [...previous.previousPaths, previous.relativePath].filter((path) => path !== relative).map((path) => `${basePath}/.goose/history/${path}`) : [])]);
  const copied: string[] = [];
  const prefix = `${historyHash(pageId)}.`;
  for (const source of sources) {
    if (source === directory || !await fs.exists(source)) continue;
    for (const entry of await fs.readDir(source)) {
      if (!entry.isFile || !entry.name.startsWith(prefix) || !entry.name.endsWith(".json")) continue;
      const from = `${source}/${entry.name}`, to = `${directory}/${entry.name}`;
      const text = await fs.readFile(from);
      if (!text) throw new Error("历史文件无法读取，未清除原文件");
      const data = JSON.parse(text);
      if (data.pageId !== pageId) throw new Error("历史文件标识不一致，未清除原文件");
      const target = await fs.exists(to) ? await fs.readFile(to) : null;
      if (target !== null && target !== text) throw new Error("历史迁移目标已有不同版本，双方记录已保留");
      if (target === null && !await fs.writeFile(to, text)) throw new Error("历史迁移写入失败，原文件已保留");
      if (await fs.readFile(to) !== text) throw new Error("历史迁移校验失败，原文件已保留");
      copied.push(from);
    }
  }
  if (!previous || previous.relativePath !== relative) {
    locations.pages[pageId] = { relativePath: relative, previousPaths: [...new Set([...(previous?.previousPaths ?? []), ...(previous ? [previous.relativePath] : [])])] };
    await writeHistoryJson(`${basePath}/.goose/history-map.json`, locations, fs);
  }
  for (const source of copied) if (!await fs.deleteFile(source)) throw new Error("历史已迁移，旧副本尚未清理；下次备份将重试");
  return directory;
}

/** Migrate every legacy index, including histories of currently missing notes. */
export async function migrateNotebookHistory(basePath: string, knownPaths: Record<string, string> = {}, provided?: HistoryDisk) {
  const fs = provided ?? rendererHistoryDisk();
  if (!fs) return;
  return historyDiskOperation(basePath, async () => {
    const root = `${basePath}/.goose/history`;
    if (!await fs.exists(root)) return;
    const locations = await readHistoryLocations(basePath, fs);
    const paths: Record<string, string | null> = { ...Object.fromEntries(Object.entries(locations.pages).map(([id, entry]) => [id, entry.relativePath])), ...knownPaths };
    // Reopened notebooks may have a new page ID for the same note. Move their shared timeline together.
    for (const [id, next] of Object.entries(knownPaths)) {
      const previous = locations.pages[id]?.relativePath;
      if (!previous || previous === next) continue;
      for (const [alias, entry] of Object.entries(locations.pages)) {
        if (entry.relativePath === previous && !Object.hasOwn(knownPaths, alias)) paths[alias] = next;
      }
    }
    for (const entry of await fs.readDir(root)) {
      if (!entry.isFile || !/^[a-f0-9]{8}\..+\.json$/.test(entry.name)) continue;
      const text = await fs.readFile(`${root}/${entry.name}`);
      if (!text) throw new Error("历史文件无法读取，已停止迁移");
      const data = JSON.parse(text);
      if (typeof data.pageId !== "string") throw new Error("历史文件格式无效，已停止迁移");
      paths[data.pageId] ??= data.relativePath ?? originalHistoryPath(data.pageId, data.workspaceId);
    }
    for (const [id, path] of Object.entries(paths)) await bindHistoryLocation(basePath, id, path, fs);
  });
}

export async function portableHistoryIds(basePath: string): Promise<Record<string, string>> {
  const fs = rendererHistoryDisk();
  if (!fs) return {};
  const locations: HistoryLocations = await readHistoryLocations(basePath, fs);
  const result: Record<string, string> = Object.create(null);
  for (const [id, entry] of Object.entries(locations.pages)) {
    const index = `${basePath}/.goose/history/${entry.relativePath}/${historyHash(id)}.index.json`;
    if (await fs.exists(`${basePath}/${entry.relativePath}`) && await fs.exists(index)) result[entry.relativePath] ??= id;
  }
  return result;
}
