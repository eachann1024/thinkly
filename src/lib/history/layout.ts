import { historyText as uiText } from "./messages";
import { normalizeHistoryIndex } from "./guards";
import { HISTORY_HASH_DIR, historyHash, validHistoryRelativePath } from "./localPaths";
import { writeHistoryJson, type HistoryDisk } from "./localDisk";
import type { HistoryIndexEntry } from "./types";

/** 布局 2：`.goose/history/<hash(pageId)>/meta.json` + `<versionId>.json` 快照。 */
export interface HistoryMeta {
  version: 2;
  pageId: string;
  relativePath: string | null;
  previousPaths: string[];
  versions: HistoryIndexEntry[];
  lastVersionCharCount: number;
}

export const META_FILE = "meta.json";
const MAX_PREVIOUS_PATHS = 20;

export const historyRoot = (basePath: string) => `${basePath}/.goose/history`;
export const isSafeVersionId = (id: string) => /^[a-zA-Z0-9_-]+$/.test(id) && id !== "meta";

export function parseHistoryMeta(text: string): HistoryMeta {
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== "object" || typeof raw.pageId !== "string" || !raw.pageId) throw new Error(uiText("theHistoryFileFormatIsInvalidMigrationStopped"));
  const index = normalizeHistoryIndex(raw, raw.pageId);
  return {
    version: 2,
    pageId: raw.pageId,
    relativePath: validHistoryRelativePath(raw.relativePath) ? raw.relativePath : null,
    previousPaths: Array.isArray(raw.previousPaths) ? raw.previousPaths.filter(validHistoryRelativePath) : [],
    versions: index.versions,
    lastVersionCharCount: index.lastVersionCharCount,
  };
}

export function emptyHistoryMeta(pageId: string, relativePath: string | null): HistoryMeta {
  return { version: 2, pageId, relativePath: validHistoryRelativePath(relativePath) ? relativePath : null, previousPaths: [], versions: [], lastVersionCharCount: 0 };
}

/** 同笔记本内改名/移动只改路径，不搬历史目录。 */
export function withHistoryPath(meta: HistoryMeta, relativePath: string): HistoryMeta {
  if (meta.relativePath === relativePath) return meta;
  const previous = [...meta.previousPaths, ...(meta.relativePath ? [meta.relativePath] : [])].filter((path) => path !== relativePath);
  return { ...meta, relativePath, previousPaths: [...new Set(previous)].slice(-MAX_PREVIOUS_PATHS) };
}

export async function readHistoryMetaAt(dir: string, fs: HistoryDisk): Promise<HistoryMeta | null> {
  const file = `${dir}/${META_FILE}`;
  if (!await fs.exists(file)) return null;
  const text = await fs.readFile(file);
  if (!text) throw new Error(uiText("theHistoryFileCouldnTBeReadMigrationStopped"));
  return parseHistoryMeta(text);
}

/** 找到该 pageId 的目录；8 位哈希冲突时依次探测 `-1`、`-2`…，未占用则返回首个空位。 */
export async function findHistoryEntry(basePath: string, pageId: string, fs: HistoryDisk): Promise<{ dir: string; meta: HistoryMeta | null }> {
  const hash = historyHash(pageId);
  for (let i = 0; i < 32; i++) {
    const dir = `${historyRoot(basePath)}/${i ? `${hash}-${i}` : hash}`;
    const meta = await readHistoryMetaAt(dir, fs);
    if (!meta || meta.pageId === pageId) return { dir, meta };
  }
  throw new Error(uiText("historyFileIdentifiersDonTMatchTheOriginalHas"));
}

const portableCache = new Map<string, { at: number; value: Record<string, string> }>();
export const cachedPortableIds = (basePath: string) => portableCache.get(basePath);
export const rememberPortableIds = (basePath: string, value: Record<string, string>) => portableCache.set(basePath, { at: Date.now(), value });
export const invalidatePortableIds = (basePath: string) => void portableCache.delete(basePath);

export async function writeHistoryMeta(basePath: string, dir: string, meta: HistoryMeta, fs: HistoryDisk): Promise<void> {
  if (!await fs.exists(dir) && !await fs.mkdir(dir)) throw new Error(uiText("couldnTCreateTheDestinationHistoryFolder"));
  await writeHistoryJson(`${dir}/${META_FILE}`, meta, fs);
  invalidatePortableIds(basePath);
}

export const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** 只读 meta.json 的轻量枚举；分批并让出主线程，损坏的条目跳过不影响其余。 */
export async function listHistoryEntries(basePath: string, fs: HistoryDisk): Promise<{ dir: string; meta: HistoryMeta }[]> {
  const root = historyRoot(basePath);
  if (!await fs.exists(root)) return [];
  const dirs = (await fs.readDir(root)).filter((entry) => entry.isDirectory && HISTORY_HASH_DIR.test(entry.name));
  const result: { dir: string; meta: HistoryMeta }[] = [];
  for (let i = 0; i < dirs.length; i += 16) {
    const batch = await Promise.all(dirs.slice(i, i + 16).map(async (entry) => {
      try {
        const meta = await readHistoryMetaAt(entry.path, fs);
        return meta ? { dir: entry.path, meta } : null;
      } catch (error) {
        console.warn("[history] 跳过无法读取的历史条目", entry.path, error);
        return null;
      }
    }));
    for (const item of batch) if (item) result.push(item);
    if (i + 16 < dirs.length) await yieldToMain();
  }
  return result;
}
