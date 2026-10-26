import { randomUUID } from "node:crypto";
import { link, lstat, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";

const pending = new Map<string, Promise<unknown>>();

export async function compareAndSwapText(
  file: string, expected: string | null, next: string, beforeCommit: () => void = () => {},
): Promise<boolean> {
  const target = path.join(await realpath(path.dirname(file)), path.basename(file));
  const key = process.platform === "linux" ? target : target.toLowerCase();
  const previous = pending.get(key) ?? Promise.resolve();
  const work = previous.catch(() => {}).then(async () => {
    let current: string | null = null;
    let mode = 0o600;
    try {
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe note file target");
      mode = info.mode & 0o777;
      current = await readFile(target, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (current !== expected) return false;
    if (current === next) return true;
    const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
    let owned = false;
    try {
      const handle = await open(temporary, "wx", mode);
      owned = true;
      try { await handle.writeFile(next, "utf8"); await handle.sync(); }
      finally { await handle.close(); }
      beforeCommit();
      if (expected === null) {
        try { await link(temporary, target); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
      } else {
        if (await readFile(target, "utf8") !== expected) return false;
        await rename(temporary, target);
        owned = false;
      }
      if (process.platform !== "win32") {
        const directory = await open(path.dirname(target), "r");
        try { await directory.sync(); } finally { await directory.close(); }
      }
      return true;
    } finally {
      if (owned) await unlink(temporary);
    }
  });
  pending.set(key, work);
  try { return await work; }
  finally { if (pending.get(key) === work) pending.delete(key); }
}
