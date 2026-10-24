
import {
  readDbStorageJSON,
  removeDbStorageItem,
  writeDbStorageJSON,
} from "./storage/localDbStorage";

const IDMAP_KEY_PREFIX = "gn:local-idmap:";
const TRANSFERRED_IDS_KEY = "gn:local-transferred-page-ids";

export type LocalPageIdMap = Record<string, string>;

function storageKey(notebookId: string): string {
  return `${IDMAP_KEY_PREFIX}${notebookId}`;
}

export function readLocalPageIdMap(notebookId: string): LocalPageIdMap {
  return readDbStorageJSON<LocalPageIdMap>(storageKey(notebookId), {});
}

export function writeLocalPageIdMap(
  notebookId: string,
  map: LocalPageIdMap,
): void {
  writeDbStorageJSON(storageKey(notebookId), map);
}

export function removeLocalPageIdMap(notebookId: string): void {
  removeDbStorageItem(storageKey(notebookId));
}

export function toRelativePath(basePath: string, filePath: string): string {
  return filePath.replace(basePath, "").replace(/^[\/\\]/, "");
}

function generateStableId(notebookId: string, relativePath: string): string {
  return `local-${notebookId}-${encodeURIComponent(relativePath)}`;
}

function findRelativePathById(
  map: LocalPageIdMap,
  id: string,
): string | undefined {
  return Object.keys(map).find((key) => map[key] === id);
}

function generateAvailableStableId(
  notebookId: string,
  relativePath: string,
  map: LocalPageIdMap,
): string {
  const baseId = generateStableId(notebookId, relativePath);
  const existingRelative = findRelativePathById(map, baseId);
  const transferred = readDbStorageJSON<string[]>(TRANSFERRED_IDS_KEY, []);
  if (
    (!existingRelative || existingRelative === relativePath) &&
    !transferred.includes(baseId)
  ) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}--${suffix}`;
  const usedIds = new Set([...Object.values(map), ...transferred]);
  while (usedIds.has(candidate)) {
    suffix++;
    candidate = `${baseId}--${suffix}`;
  }

  console.warn(
    "[local-page-idmap] generated id occupied, assigning unique id",
    { baseId, existingRelative, relativePath, candidate },
  );
  return candidate;
}

export function transferLocalPageIdMapTree(
  sourceNotebookId: string,
  targetNotebookId: string,
  oldRelativePath: string,
  newRelativePath: string,
  knownEntries: Array<{ id: string; relativePath: string }>,
): void {
  const source = readLocalPageIdMap(sourceNotebookId);
  const target = readLocalPageIdMap(targetNotebookId);
  for (const entry of knownEntries) source[entry.relativePath] = entry.id;
  const transferred = new Set(
    readDbStorageJSON<string[]>(TRANSFERRED_IDS_KEY, []),
  );
  for (const [relativePath, id] of Object.entries(source)) {
    if (
      relativePath !== oldRelativePath &&
      !relativePath.startsWith(oldRelativePath + "/")
    )
      continue;
    target[newRelativePath + relativePath.slice(oldRelativePath.length)] = id;
    transferred.add(id);
    delete source[relativePath];
  }
  writeLocalPageIdMap(targetNotebookId, target);
  writeDbStorageJSON(TRANSFERRED_IDS_KEY, [...transferred]);
  writeLocalPageIdMap(sourceNotebookId, source);
}

export function resolveOrCreateStableId(
  notebookId: string,
  relativePath: string,
  map: LocalPageIdMap,
): { id: string; dirty: boolean } {
  if (map[relativePath]) {
    return { id: map[relativePath], dirty: false };
  }
  const id = generateAvailableStableId(notebookId, relativePath, map);
  map[relativePath] = id;
  return { id, dirty: true };
}

export function assignExistingStableId(
  _notebookId: string,
  relativePath: string,
  existingId: string,
  map: LocalPageIdMap,
): { dirty: boolean } {
  if (!existingId) return { dirty: false };
  if (map[relativePath] === existingId) return { dirty: false };
  if (map[relativePath] && map[relativePath] !== existingId) {
    console.warn(
      "[local-page-idmap] assignExistingStableId: path already mapped to different id",
      { relativePath, existing: map[relativePath], existingId },
    );
    return { dirty: false };
  }
  map[relativePath] = existingId;
  return { dirty: true };
}

export function migrateLocalPageIdMapEntry(
  notebookId: string,
  oldRelativePath: string,
  newRelativePath: string,
  currentPageId: string,
): void {
  const map = readLocalPageIdMap(notebookId);
  const stableId = map[oldRelativePath] ?? currentPageId;

  if (map[newRelativePath] && map[newRelativePath] !== stableId) {
    console.warn(
      "[local-page-idmap] migrateEntry: new path already mapped to different id",
      { newRelativePath, existing: map[newRelativePath], stableId },
    );
    return;
  }

  delete map[oldRelativePath];
  map[newRelativePath] = stableId;
  writeLocalPageIdMap(notebookId, map);
}

export function pruneLocalPageIdMap(
  notebookId: string,
  liveRelativePaths: Set<string>,
): void {
  const map = readLocalPageIdMap(notebookId);
  let changed = false;
  for (const rel of Object.keys(map)) {
    if (!liveRelativePaths.has(rel)) {
      delete map[rel];
      changed = true;
    }
  }
  if (changed) {
    writeLocalPageIdMap(notebookId, map);
  }
}
