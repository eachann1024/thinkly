import { isGitMessage } from "../../src/lib/git-messages";
import { isDesktopMessage } from "./i18n/messages";
import { getLocale } from "../../src/i18n/core";
import { t } from "./i18n/gitErrors";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import type { GitFolderCheck } from "../../src/lib/git-sync-contract";
import { addVaultRoot, assertAllowed, findVaultRootContaining, hasUnsafeSegments, normalizePath } from "./allowlist";
import { validateGitSyncFolder } from "./gitRepositoryEngine";

/** 应用里已经打开的笔记本根目录必须能同步。漏登记是程序问题，不拿来提示用户。 */
export async function rememberNotebookRoot(localPath: unknown): Promise<boolean> {
  if (typeof localPath !== "string" || hasUnsafeSegments(localPath)) return false;
  let resolved: string;
  try { resolved = normalizePath(localPath); } catch { return false; }
  if (resolved === path.parse(resolved).root) return false;
  const stat = await lstat(resolved).catch(() => null);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) return false;
  const real = await realpath(resolved).catch(() => null);
  if (!real || normalizePath(real) !== resolved) return false;
  addVaultRoot(resolved);
  return true;
}

export async function checkedGitRoot(localPath: string) {
  const allowed = assertAllowed(localPath);
  const stat = await lstat(allowed);
  const root = await realpath(allowed);
  if (!stat.isDirectory() || stat.isSymbolicLink() || normalizePath(root) !== normalizePath(allowed)) throw new Error(t("noSymlink"));
  assertAllowed(root);
  const vault = findVaultRootContaining(root);
  if (!vault || normalizePath(await realpath(vault)) !== normalizePath(root)) throw new Error(t("reopenRoot"));
  return root;
}

export async function checkGitFolder(localPath: unknown): Promise<GitFolderCheck> {
  if (typeof localPath !== "string") return { error: t("invalidPath") };
  await rememberNotebookRoot(localPath);
  try {
    await validateGitSyncFolder(await checkedGitRoot(localPath));
    return { error: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { error: t("missingFolder") };
    if (code === "EACCES" || code === "EPERM") return { error: t("readPermission") };
    const message = error instanceof Error && (isDesktopMessage(error.message) || isGitMessage(error.message) || (getLocale() === "zh-Hans" && /^[\u3400-\u9fff]/.test(error.message))) ? error.message.slice(0, 1000) : t("checkFolder");
    const problemPath = /^(?:路径：|Path: )(.+)$/m.exec(message)?.[1];
    if (problemPath) {
      const relative = path.relative(normalizePath(localPath), normalizePath(problemPath));
      if (!relative.startsWith("..") && !path.isAbsolute(relative)) return { error: message, path: assertAllowed(problemPath) };
    }
    return { error: message };
  }
}
