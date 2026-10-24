import { execFile } from "node:child_process";
import { realpath, rm } from "node:fs/promises";
import path from "node:path";
import { ipcMain } from "electron";
import { assertAllowed } from "../allowlist";
import { withSelfWriteMark } from "./watchEvents";

function gooseRoot(target: string): string | null {
  const parts = target.split(/[\\/]/);
  const index = parts.lastIndexOf(".goose");
  if (index < 0) return null;
  return parts.slice(0, index + 1).join(path.sep) || null;
}

const hidden = new Set<string>();
export async function hideGooseDirectory(target: string): Promise<void> {
  if (process.platform !== "win32") return;
  const root = gooseRoot(target);
  if (!root || hidden.has(root)) return;
  hidden.add(root);
  await new Promise<void>((resolve) => {
    execFile("attrib", ["+h", root], { windowsHide: true }, () => resolve());
  });
}

export function registerGooseInternalIpc(): void {
  ipcMain.handle("desktop:fsPurgeGoose", async (_event, p: string) => {
    const target = assertAllowed(p);
    const root = gooseRoot(target);
    const rest = root ? path.relative(root, target).split(path.sep) : [];
    const allowed =
      rest[0] === "history-map.json" ? rest.length === 1 : rest[0] === "history" && rest.length > 1;
    if (!allowed) throw new Error("Refusing to purge a path outside .goose/history");
    if (rest[0] === "history") {
      try {
        const realHistory = await realpath(path.join(root!, "history"));
        const realParent = await realpath(path.dirname(target));
        const relative = path.relative(realHistory, realParent);
        if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing to purge outside .goose/history (symlink)");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw error;
      }
    }
    await withSelfWriteMark([target], () => rm(target, { recursive: true, force: true }));
  });
}
