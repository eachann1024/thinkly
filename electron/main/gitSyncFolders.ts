import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import type { GitFolderCheck } from "../../src/lib/git-sync-contract";
import { assertAllowed, findVaultRootContaining, normalizePath } from "./allowlist";
import { validateGitSyncFolder } from "./gitRepositoryEngine";

export async function checkedGitRoot(localPath: string) {
  const allowed = assertAllowed(localPath);
  const stat = await lstat(allowed);
  const root = await realpath(allowed);
  if (!stat.isDirectory() || stat.isSymbolicLink() || normalizePath(root) !== normalizePath(allowed)) throw new Error("同步文件夹不能使用符号链接");
  assertAllowed(root);
  const vault = findVaultRootContaining(root);
  if (!vault || normalizePath(await realpath(vault)) !== normalizePath(root)) throw new Error("请先打开或重新关联此笔记本的根文件夹");
  return root;
}

export async function checkGitFolder(localPath: unknown): Promise<GitFolderCheck> {
  if (typeof localPath !== "string") return { error: "文件夹路径无效" };
  try {
    await validateGitSyncFolder(await checkedGitRoot(localPath));
    return { error: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { error: "文件夹或文件已不存在，请重新关联文件夹" };
    if (code === "EACCES" || code === "EPERM") return { error: "没有读取文件夹的权限，请检查权限" };
    const message = error instanceof Error && /^[\u3400-\u9fff]/.test(error.message) ? error.message.slice(0, 1000) : "无法检查文件夹，请检查路径与读取权限";
    const problemPath = /^路径：(.+)$/m.exec(message)?.[1];
    if (problemPath) {
      const relative = path.relative(normalizePath(localPath), normalizePath(problemPath));
      if (!relative.startsWith("..") && !path.isAbsolute(relative)) return { error: message, path: assertAllowed(problemPath) };
    }
    return { error: message };
  }
}
