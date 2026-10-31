import { t } from "./i18n/gitErrors";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { GitRepositoryInput } from "../../src/lib/git-sync-contract";
import { assertTree, safeTarget, scan } from "./gitSyncFiles";
import { durableAtomicWrite } from "./gitSyncDisk";
import { GitConflictError, retainGitConflicts, type GitSyncConflict } from "./gitSyncConflict";
import { reconcileFiles } from "./gitSyncReconcile";
import { retainDeletedGitFiles } from "./gitSyncRecovery";

type Files = Record<string, string>;
export type GitSyncSnapshots = Record<string, Files>;
export interface GitSyncJournal {
  commit: string;
  before: GitSyncSnapshots;
  after: GitSyncSnapshots;
  // A recovered journal may contain newer local edits that are not in commit yet.
  baseline?: GitSyncSnapshots;
}
const keyOf = (folder: GitRepositoryInput["folders"][number]) => `${folder.notebookId}:${folder.remotePath}`;

export function recoverGitSyncJournal(config: GitRepositoryInput, identity: string, journal: GitSyncJournal, current: GitSyncSnapshots): GitSyncJournal {
  const changed = config.folders.some((folder) => {
    const key = keyOf(folder), after = journal.after[key] ?? {}, local = current[key] ?? {};
    return [...new Set([...Object.keys(after), ...Object.keys(local)])]
      .some((name) => local[name] !== after[name]);
  });
  if (!changed) return journal;
  const after: GitSyncSnapshots = {};
  const active = new Set<string>();
  const unresolved: GitSyncConflict[] = [];
  for (const folder of config.folders) {
    const key = keyOf(folder), before = journal.before[key] ?? {}, local = current[key] ?? {}, remote = journal.after[key] ?? {};
    after[key] = retainDeletedGitFiles(before, local, remote, reconcileFiles(before, local, remote, {
      repositoryId: config.id, identity: `${identity}:recovery:${journal.commit}`, folder, active, unresolved, recovering: true,
    }));
    assertTree(after[key]!);
  }
  retainGitConflicts(config.id, active);
  if (unresolved.length) throw new GitConflictError(unresolved, t("recoveryConflictChoices"));
  return { commit: journal.commit, before: current, after, baseline: journal.baseline ?? journal.after };
}

export async function applyGitSyncJournal(config: GitRepositoryInput, journal: GitSyncJournal, verifyRoot?: (root: string) => Promise<void>) {
  for (const folder of config.folders) {
    await verifyRoot?.(folder.localPath);
    const key = keyOf(folder), before = journal.before[key] ?? {}, after = journal.after[key] ?? {};
    const current = await scan(folder.localPath);
    for (const name of new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(current)])) {
      if (current[name] !== before[name] && current[name] !== after[name]) throw new Error(t("recoveryLocalChanged"));
      await safeTarget(folder.localPath, name);
    }
  }
  for (const folder of config.folders) {
    const key = keyOf(folder), before = journal.before[key] ?? {}, after = journal.after[key] ?? {};
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      await verifyRoot?.(folder.localPath);
      const target = await safeTarget(folder.localPath, name);
      const current = await readFile(target).then((value) => value.toString("base64")).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; });
      if (current === after[name]) continue;
      if (current !== before[name]) throw new Error(t("applyChanged"));
      if (after[name] === undefined) {
        await rm(target);
        if (process.platform !== "win32") {
          const directory = await open(path.dirname(target), "r");
          try { await directory.sync(); } finally { await directory.close(); }
        }
      } else {
        await mkdir(path.dirname(target), { recursive: true });
        await safeTarget(folder.localPath, name);
        await durableAtomicWrite(target, Buffer.from(after[name]!, "base64"));
      }
    }
  }
}
