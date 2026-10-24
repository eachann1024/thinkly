import { canonicalRelativePath } from "../../src/lib/canonicalLocalPath";
import { t } from "./i18n/nativeServices";
import { assertGitSyncWritable } from "./gitSyncLock";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, cp, lstat, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { trashUndoTransition, type TrashUndoState, type TrashUndoEvent } from "./trashUndoState";

const pending = new Map<string, Exclude<TrashUndoState, { status: "missing" }>>();
function transition(token: string, event: TrashUndoEvent) {
  const previous: TrashUndoState = pending.get(token) ?? { status: "missing" };
  const next = trashUndoTransition(previous, event);
  if (next.status === "missing") pending.delete(token); else pending.set(token, next);
  return next !== previous;
}
function retentionTimer(token: string, backup: string) {
  const timer = setTimeout(() => {
    if (transition(token, { type: "expire", timer })) {
      void rm(path.dirname(backup), { recursive: true, force: true });
    }
  }, RETAIN_MS);
  timer.unref();
  return timer;
}
const RETAIN_MS = 10 * 60_000;

export async function trashWithUndo(
  original: string,
  backupRoot: string,
  trash: (source: string) => Promise<void>,
): Promise<string> {
  const token = randomUUID();
  const backupDir = path.join(backupRoot, token);
  const backup = path.join(backupDir, "item");
  await mkdir(backupDir, { recursive: true });
  try {
    await cp(original, backup, { recursive: true, preserveTimestamps: true });
    await trash(original);
  } catch (error) {
    await rm(backupDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  const timer = retentionTimer(token, backup);
  transition(token, { type: "retain", original, backup, timer });
  return token;
}

export async function undoTrash(token: string): Promise<string> {
  const item = pending.get(token);
  if (!item) throw new Error(t(process.platform === "win32" ? "undoExpiredRecycle" : "undoExpiredTrash"));
  if (item.status === "restoring") throw new Error(t("undoBusy"));
  const { original, backup, timer } = item;
  assertGitSyncWritable(original);
  transition(token, { type: "restore" });
  clearTimeout(timer);
  try {
    try {
      await lstat(original);
      throw new Error(t("undoConflict"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const backupInfo = await lstat(backup);
    if (backupInfo.isDirectory()) {
      await mkdir(original);
      for (const child of await readdir(backup)) {
        await cp(path.join(backup, child), path.join(original, child), {
          recursive: true, force: false, errorOnExist: true, preserveTimestamps: true,
        });
      }
    } else {
      if (backupInfo.isSymbolicLink()) {
        await cp(backup, original, { force: false, errorOnExist: true });
      } else {
        await copyFile(backup, original, constants.COPYFILE_EXCL);
      }
    }
    transition(token, { type: "restored" });
    void rm(path.dirname(backup), { recursive: true, force: true });
    return original;
  } catch (error) {
    transition(token, { type: "retry", timer: retentionTimer(token, backup) });
    throw error;
  }
}

function rebaseUndoPath(filePath: string, oldRoot: string, newRoot: string): string {
  const relative = canonicalRelativePath(oldRoot, filePath);
  if (relative === null) return filePath;
  const next = newRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  return relative ? `${next}/${relative}` : next;
}

export function retargetTrashUndoPaths(oldRoot: string, newRoot: string): void {
  for (const [token, item] of pending) {
    if (item.status !== "retained" && item.status !== "restoring") continue;
    const original = rebaseUndoPath(item.original, oldRoot, newRoot);
    if (original !== item.original) pending.set(token, { ...item, original });
  }
}

export async function cleanupOldTrashUndoCopies(root: string): Promise<void> {
  for (const entry of await readdir(root).catch(() => [])) {
    if (!/^[0-9a-f-]{36}$/i.test(entry)) continue;
    const dir = path.join(root, entry);
    if (Date.now() - (await stat(dir)).mtimeMs > 24 * 60 * 60_000) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
