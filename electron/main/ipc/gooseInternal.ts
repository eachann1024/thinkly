import { execFile } from "node:child_process";
import { realpath, rm } from "node:fs/promises";
import path from "node:path";
import { ipcMain } from "electron";
import { assertAllowed } from "../allowlist";
import { withSelfWriteMark } from "./watchEvents";

/** 返回 `.goose` 目录本身的路径；目标不在 `.goose` 之内时返回 null。 */
function gooseRoot(target: string): string | null {
  const parts = target.split(/[\\/]/);
  const index = parts.lastIndexOf(".goose");
  if (index < 0) return null;
  return parts.slice(0, index + 1).join(path.sep) || null;
}

/** Windows 上把 `.goose` 设为隐藏；其他平台以点号开头已隐藏。失败静默。 */
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

/** 仅允许永久删除 `.goose/history/**` 与 `.goose/history-map.json`（历史迁移与过期清理）。 */
export function registerGooseInternalIpc(): void {
  ipcMain.handle("desktop:fsPurgeGoose", async (_event, p: string) => {
    const target = assertAllowed(p);
    const root = gooseRoot(target);
    const rest = root ? path.relative(root, target).split(path.sep) : [];
    const allowed =
      rest[0] === "history-map.json" ? rest.length === 1 : rest[0] === "history" && rest.length > 1;
    if (!allowed) throw new Error("Refusing to purge a path outside .goose/history");
    // 符号链接防护：真实父目录必须仍位于真实的 .goose/history 之内。
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
