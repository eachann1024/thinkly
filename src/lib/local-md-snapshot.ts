import { canonicalRelativePath } from "./canonicalLocalPath";


export type LocalMdFileStat = {
  mtimeMs: number;
  size: number;
};

type SnapshotEntry = {
  content: string;
  mtimeMs?: number;
  size?: number;
};

const snapshotMap = new Map<string, SnapshotEntry>();

function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\n+$/, "");
}

export function setLocalMdSnapshot(absPath: string, rawContent: string): void {
  snapshotMap.set(absPath, { content: rawContent });
}

export function getLocalMdSnapshot(absPath: string): string | undefined {
  return snapshotMap.get(absPath)?.content;
}

export function isLocalMdUnchanged(
  absPath: string,
  pendingContent: string,
): boolean {
  const snapshot = snapshotMap.get(absPath)?.content;
  if (snapshot === undefined) return false;
  return normalize(pendingContent) === normalize(snapshot);
}

export function updateSnapshotAfterWrite(
  absPath: string,
  writtenContent: string,
): void {
  snapshotMap.set(absPath, { content: writtenContent });
}

export function updateSnapshotStat(
  absPath: string,
  stat: LocalMdFileStat,
): void {
  const existing = snapshotMap.get(absPath);
  if (!existing) return;
  existing.mtimeMs = stat.mtimeMs;
  existing.size = stat.size;
}

export function isStatMatchingSnapshot(
  absPath: string,
  stat: LocalMdFileStat,
): boolean {
  const existing = snapshotMap.get(absPath);
  if (
    existing === undefined ||
    existing.mtimeMs === undefined ||
    existing.size === undefined
  ) {
    return false;
  }
  return (
    existing.mtimeMs === stat.mtimeMs &&
    existing.size === stat.size &&
    Date.now() - stat.mtimeMs > 2500
  );
}

const selfWriteTimestamps = new Map<string, number>();

export function markSelfWrite(absPath: string): void {
  selfWriteTimestamps.set(absPath, Date.now());
}

export function wasRecentlySelfWritten(
  absPath: string,
  windowMs = 2000,
): boolean {
  const t = selfWriteTimestamps.get(absPath);
  return t !== undefined && Date.now() - t < windowMs;
}

export function deleteLocalMdSnapshot(absPath: string): void {
  snapshotMap.delete(absPath);
}

export function relocateLocalMdSnapshots(oldRoot: string, newRoot: string): void {
  const nextRoot = newRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const relocate = <T,>(map: Map<string, T>) => {
    const moved: Array<[string, T]> = [];
    for (const [key, value] of map) {
      const relative = canonicalRelativePath(oldRoot, key);
      if (relative === null) continue;
      moved.push([relative ? `${nextRoot}/${relative}` : nextRoot, value]);
      map.delete(key);
    }
    for (const [key, value] of moved) map.set(key, value);
  };
  relocate(snapshotMap);
  relocate(selfWriteTimestamps);
}

export function clearAllLocalMdSnapshots(): void {
  snapshotMap.clear();
  selfWriteTimestamps.clear();
}

export function isDiskContentMatchingSnapshot(
  absPath: string,
  diskContent: string,
): boolean {
  const snapshot = snapshotMap.get(absPath)?.content;
  if (snapshot === undefined) return true;
  return normalize(diskContent) === normalize(snapshot);
}

export function applyTrailingNewlineStyle(
  absPath: string,
  content: string,
): string {
  if (/\n$/.test(content)) return content;
  const snapshot = snapshotMap.get(absPath)?.content;
  if (snapshot === undefined) return `${content}\n`;
  const trailing = snapshot.match(/\n*$/)?.[0] ?? "";
  return content + trailing;
}
