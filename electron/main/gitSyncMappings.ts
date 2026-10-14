import { comparisonLocalPath, localPathsAreCaseInsensitive } from "../../src/lib/canonicalLocalPath";
import { validateGitRepository, type GitRepositoryConfig, type GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { checkedGitRoot } from "./gitSyncFolders";
import { validateGitSyncFolder } from "./gitRepositoryEngine";
import { preserveReboundHistory } from "./gitSyncRebind";

const pathKey = (value: string) => comparisonLocalPath(value, localPathsAreCaseInsensitive()).replace(/\/+$/, "");

export function sameGitFolderTargets(a: GitRepositoryFolder[], b: GitRepositoryFolder[]) {
  return a.length === b.length && a.every((folder) => b.some((other) =>
    folder.remotePath === other.remotePath && pathKey(folder.localPath) === pathKey(other.localPath)));
}

/** Reopening a path creates a notebook ID, but must retain its remote directory. */
export async function prepareGitFolderMappings(
  input: GitRepositoryConfig,
  previous: GitRepositoryConfig | undefined,
  history: GitRepositoryFolder[],
  storageRoot: string,
) {
  const rebound: { old: GitRepositoryFolder; next: GitRepositoryFolder }[] = [];
  for (const folder of input.folders) {
    const existing = previous?.folders.find((old) => old.notebookId === folder.notebookId);
    if (!existing || pathKey(existing.localPath) !== pathKey(folder.localPath)) {
      folder.localPath = await checkedGitRoot(folder.localPath);
      await validateGitSyncFolder(folder.localPath);
    }
    const old = history.find((entry) => entry.notebookId === folder.notebookId)
      ?? history.find((entry) => pathKey(entry.localPath) === pathKey(folder.localPath));
    if (old) {
      if (pathKey(old.localPath) !== pathKey(folder.localPath)) throw new Error("原文件夹路径已变化，请重新选择文件夹恢复关联");
      folder.remotePath = old.remotePath;
      if (old.notebookId !== folder.notebookId) rebound.push({ old, next: folder });
    } else if (input.layout === "legacy-root") {
      throw new Error("旧布局只能重新选择原文件夹");
    }
    if (history.some((entry) => entry !== old && entry.remotePath.normalize("NFC").toLowerCase() === folder.remotePath.normalize("NFC").toLowerCase())) {
      throw new Error("此远端子目录已保留给其他笔记本，请使用新名称");
    }
  }
  const validated = validateGitRepository(input);
  for (const { old, next } of rebound) {
    // A replacement at the same path is not proof of disk identity. Reattach
    // conservatively so missing local files cannot delete remote notes.
    await preserveReboundHistory(storageRoot, input.id, old, next);
  }
  return validated;
}
