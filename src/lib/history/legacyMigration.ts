import { normalizeHistoryIndex } from "./guards";
import { emptyHistoryMeta, findHistoryEntry, historyRoot, isSafeVersionId, readHistoryMetaAt, writeHistoryMeta, yieldToMain, type HistoryMeta } from "./layout";
import { markHistoryLayout } from "./layoutMarker";
import type { HistoryDisk } from "./localDisk";
import { HISTORY_HASH_DIR, originalHistoryPath, parseHistoryLocations, validHistoryRelativePath, type HistoryLocations } from "./localPaths";
import type { HistoryIndexEntry } from "./types";

const LEGACY_FILE = /^[a-f0-9]{8}\.(.+)\.json$/;

interface LegacyFile { path: string; dir: string; kind: string }
interface Group {
  indexFiles: string[];
  versionFiles: { path: string; versionId: string }[];
  entries: Map<string, HistoryIndexEntry>;
  orphans: Map<string, HistoryIndexEntry>;
  paths: string[];
  workspaceId?: string;
}

async function collectLegacy(root: string, fs: HistoryDisk) {
  const files: LegacyFile[] = [];
  const dirs: string[] = [];
  const walk = async (directory: string, relative: string) => {
    for (const entry of await fs.readDir(directory)) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isFile) {
        const kind = LEGACY_FILE.exec(entry.name)?.[1];
        if (kind) files.push({ path: entry.path, dir: relative, kind });
      } else if (entry.isDirectory && !(relative === "" && HISTORY_HASH_DIR.test(entry.name))) {
        dirs.push(entry.path);
        await walk(entry.path, child);
      }
    }
  };
  await walk(root, "");
  return { files, dirs };
}

async function readLegacyGroups(files: LegacyFile[], fs: HistoryDisk) {
  const groups = new Map<string, Group>();
  let failed = 0;
  for (const [position, file] of files.entries()) {
    if (position % 20 === 19) await yieldToMain();
    try {
      const text = await fs.readFile(file.path);
      const data = text ? JSON.parse(text) : null;
      const pageId = data && typeof data.pageId === "string" && data.pageId ? data.pageId : null;
      if (!pageId) throw new Error("missing pageId");
      const group: Group = groups.get(pageId) ?? { indexFiles: [], versionFiles: [], entries: new Map(), orphans: new Map(), paths: [] };
      groups.set(pageId, group);
      group.paths.push(...[data.relativePath, file.dir].filter(validHistoryRelativePath));
      if (typeof data.workspaceId === "string") group.workspaceId ??= data.workspaceId;
      if (file.kind === "index") {
        group.indexFiles.push(file.path);
        for (const entry of normalizeHistoryIndex(data, pageId).versions) if (!group.entries.has(entry.versionId)) group.entries.set(entry.versionId, entry);
      } else {
        if (data.versionId !== file.kind || !isSafeVersionId(file.kind)) throw new Error("version id mismatch");
        group.versionFiles.push({ path: file.path, versionId: file.kind });
        const entry = normalizeHistoryIndex({ versions: [data] }, pageId).versions[0];
        if (entry) group.orphans.set(file.kind, entry);
      }
    } catch (error) {
      failed++;
      console.warn("[history] 旧历史文件无法迁移，已保留原文件", file.path, error);
    }
  }
  return { groups, failed };
}

async function migrateGroup(basePath: string, pageId: string, group: Group, locations: HistoryLocations, fs: HistoryDisk): Promise<boolean> {
  const found = await findHistoryEntry(basePath, pageId, fs);
  const meta: HistoryMeta = found.meta ?? emptyHistoryMeta(pageId, null);
  const mapped = locations.pages[pageId];
  const candidates = [meta.relativePath, mapped?.relativePath, ...group.paths, originalHistoryPath(pageId, group.workspaceId)].filter(validHistoryRelativePath);
  let relativePath: string | null = candidates[0] ?? null;
  for (const candidate of candidates) if (await fs.exists(`${basePath}/${candidate}`)) { relativePath = candidate; break; }
  const previous = [...meta.previousPaths, ...(mapped?.previousPaths ?? []), ...(mapped ? [mapped.relativePath] : []), ...group.paths, ...(meta.relativePath ? [meta.relativePath] : [])];

  if (!await fs.exists(found.dir) && !await fs.mkdir(found.dir)) throw new Error(`cannot create ${found.dir}`);
  const available = new Set<string>();
  const deletable: string[] = [...group.indexFiles];
  let intact = true;
  for (const file of group.versionFiles) {
    const target = `${found.dir}/${file.versionId}.json`;
    const text = await fs.readFile(file.path);
    if (!text) { intact = false; continue; }
    const existing = await fs.exists(target) ? await fs.readFile(target) : null;
    if (existing === null && !await fs.writeFile(target, text)) throw new Error(`cannot write ${target}`);
    if (existing !== null && existing !== text) { intact = false; available.add(file.versionId); continue; }
    if (await fs.readFile(target) !== text) throw new Error(`verification failed ${target}`);
    available.add(file.versionId);
    deletable.push(file.path);
  }

  const versions = new Map(meta.versions.map((entry) => [entry.versionId, entry]));
  for (const source of [group.entries, group.orphans]) {
    for (const [versionId, entry] of source) if (!versions.has(versionId) && available.has(versionId)) versions.set(versionId, entry);
  }
  const sorted = [...versions.values()].sort((a, b) => a.createdAt - b.createdAt || a.versionId.localeCompare(b.versionId));
  const merged: HistoryMeta = {
    ...meta,
    relativePath,
    previousPaths: [...new Set(previous.filter((path): path is string => validHistoryRelativePath(path) && path !== relativePath))].slice(-20),
    versions: sorted,
    lastVersionCharCount: sorted.at(-1)?.charCount ?? 0,
  };
  await writeHistoryMeta(basePath, found.dir, merged, fs);
  const verified = await readHistoryMetaAt(found.dir, fs);
  if (verified?.versions.length !== sorted.length) throw new Error(`verification failed ${found.dir}`);
  for (const path of deletable) if (!await fs.deleteFile(path)) intact = false;
  return intact;
}

export async function ensureHistoryLayout(basePath: string, fs: HistoryDisk): Promise<void> {
  const root = historyRoot(basePath);
  const mapFile = `${basePath}/.goose/history-map.json`;
  const hasMap = await fs.exists(mapFile);
  if (!hasMap && !await fs.exists(root)) { await markHistoryLayout(basePath, fs); return; }

  let failed = 0;
  let locations: HistoryLocations = { version: 1, pages: Object.create(null) };
  if (hasMap) {
    try { locations = parseHistoryLocations(await fs.readFile(mapFile)); } catch (error) { failed++; console.warn("[history] history-map.json 无法解析，已保留", error); }
  }
  const { files, dirs } = await fs.exists(root) ? await collectLegacy(root, fs) : { files: [], dirs: [] };
  const read = await readLegacyGroups(files, fs);
  failed += read.failed;
  for (const [pageId, group] of read.groups) {
    try { if (!await migrateGroup(basePath, pageId, group, locations, fs)) failed++; } catch (error) {
      failed++;
      console.warn("[history] 迁移历史失败，已保留旧文件", pageId, error);
    }
    await yieldToMain();
  }
  if (failed) return;
  if (hasMap && !await fs.deleteFile(mapFile)) return;
  for (const dir of dirs.sort((a, b) => b.length - a.length)) {
    if (!(await fs.readDir(dir)).length) await fs.deleteDir(dir);
  }
  await markHistoryLayout(basePath, fs);
}

const checked = new Set<string>();
export async function ensureHistoryLayoutOnce(basePath: string, fs: HistoryDisk): Promise<void> {
  if (checked.has(basePath)) return;
  await ensureHistoryLayout(basePath, fs);
  checked.add(basePath);
}
