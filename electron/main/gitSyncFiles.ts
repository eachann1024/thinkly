import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
type Files = Record<string, string>;
const excluded = new Set([".git", ".ds_store", "thumbs.db", "desktop.ini", ".cache", "node_modules", ".goose-cache"]);
const empty = (): Files => Object.create(null) as Files;
export const safeParts = (name: string) => name.split("/").every((part) => part && part !== "." && part !== ".." && !/[\\\0\r\n:]/.test(part) && !/[. ]$/.test(part) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
export const ignored = (name: string) => name.split("/").some((part) => excluded.has(part.toLowerCase()) || part.startsWith(".goose-sync-"));

export async function assertRoot(root: string) {
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) throw new Error("同步文件夹已移动、缺失或包含符号链接，已停止同步");
}

export async function scan(root: string, readContents = true): Promise<Files> {
  await assertRoot(root);
  const files = empty();
  const names = new Set<string>();
  async function walk(relative: string) {
    const directory = path.join(root, relative);
    if (await realpath(directory) !== directory || (await lstat(directory)).isSymbolicLink()) throw new Error("文件夹包含符号链接，已停止同步");
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (ignored(name)) continue;
      if (entry.isSymbolicLink()) throw new Error(`发现符号链接，已停止本次同步。
路径：${path.join(root, name)}
符号链接指向其他位置，同步器不会读取或写入其目标。请将链接移出同步文件夹，或取消勾选所属文件夹，再重试同步。`);
      if (!safeParts(name)) throw new Error(`文件名不符合跨平台同步规则，已停止本次同步。
路径：${path.join(root, name)}
请重命名后重试：避免反斜杠、冒号、换行、末尾的空格或句点，以及 CON、NUL、COM1 等 Windows 保留名称。`);
      const folded = name.normalize("NFC").toLowerCase();
      if (names.has(folded)) throw new Error("文件夹包含大小写冲突的路径，已停止同步");
      names.add(folded);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) {
        const target = path.join(root, name);
        if (await realpath(target) !== target) throw new Error("文件夹包含符号链接，已停止同步");
        const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
        try { if (readContents) files[name] = (await handle.readFile()).toString("base64"); }
        finally { await handle.close(); }
      }
      else throw new Error("文件夹包含不支持的特殊文件，已停止同步");
    }
  }
  await walk("");
  return files;
}

/** Read-only preflight using the same path and access checks as actual sync. */
export async function validateGitSyncFolder(root: string): Promise<void> {
  await scan(root, false);
}

export function assertTree(files: Files) {
  const seen = new Set<string>();
  const directories = new Set<string>();
  for (const name of Object.keys(files)) {
    if (!safeParts(name) || ignored(name)) throw new Error("远端包含不安全的同步路径");
    const folded = name.normalize("NFC").toLowerCase();
    if (seen.has(folded) || directories.has(folded)) throw new Error("同步文件存在大小写或文件/目录冲突，双方内容已保留");
    const parts = folded.split("/");
    parts.pop();
    while (parts.length) {
      const parent = parts.join("/");
      if (seen.has(parent)) throw new Error("同步文件存在文件/目录冲突，双方内容已保留");
      directories.add(parent); parts.pop();
    }
    seen.add(folded);
  }
}


export async function safeTarget(root: string, name: string) {
  if (!safeParts(name) || ignored(name)) throw new Error("同步路径无效");
  await assertRoot(root);
  let target = root;
  const parts = name.split("/");
  for (const [index, part] of parts.entries()) {
    target = path.join(target, part);
    const stat = await lstat(target).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
    if (stat && (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()))) throw new Error("同步目标出现符号链接或文件/目录冲突，已保留恢复备份");
  }
  return target;
}

