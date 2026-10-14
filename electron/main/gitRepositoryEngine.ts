import { assertRoot, scan, assertTree, safeTarget, ignored, safeParts } from "./gitSyncFiles";
import { aliasGitLayout, planGitLayout, gitLayoutMetadata, assertGitLayoutTargets } from "./gitSyncLayout";
import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateGitRepository, type GitRepositoryInput, type GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { gitBytes } from "./gitSyncEngine";
import { durableAtomicWrite } from "./gitSyncDisk";
import { GitConflictError, retainGitConflicts, type GitSyncConflict } from "./gitSyncConflict";
import { reconcileFiles } from "./gitSyncReconcile";
import { describeGitSyncChanges } from "./gitSyncCommit";
import { retainDeletedGitFiles } from "./gitSyncRecovery";
export { validateGitSyncFolder } from "./gitSyncFiles";
export { GitConflictError, getGitConflict, resolveGitConflict } from "./gitSyncConflict";

type Files = Record<string, string>; // base64 bytes; snapshots are also recovery backups.
type Snapshots = Record<string, Files>;
interface Journal { commit: string; before: Snapshots; after: Snapshots }
interface Manifest { version: 1; identity: string; baseline: Snapshots; pending?: Journal; reboundKeys?: string[] }
const git = async (root: string, args: string[]) => (await gitBytes(root, args)).toString("utf8").trim();
const empty = (): Files => Object.create(null) as Files;
const mappingKey = (folder: GitRepositoryFolder) => `${folder.notebookId}:${folder.remotePath}`;
const remoteName = (folder: GitRepositoryFolder, name: string) => folder.remotePath ? `${folder.remotePath}/${name}` : name;

async function atomicJson(file: string, value: unknown) {
  await durableAtomicWrite(file, JSON.stringify(value));
}

function clearReboundKeys(manifest: Manifest, folders: GitRepositoryFolder[]) {
  const selected = new Set(folders.map(mappingKey));
  manifest.reboundKeys = manifest.reboundKeys?.filter((key) => !selected.has(key));
  if (!manifest.reboundKeys?.length) delete manifest.reboundKeys;
}

export function reconcileGitFiles(base: Files | undefined, local: Files, remote: Files): Files {
  const merged = reconcileFiles(base, local, remote);
  assertTree(merged);
  return merged;
}

async function applyJournal(config: GitRepositoryInput, journal: Journal, verifyRoot?: (root: string) => Promise<void>) {
  // Preflight every selected folder before changing any of them. A partially applied journal
  // accepts either the original or target bytes, so retries cannot turn remote edits into deletes.
  for (const folder of config.folders) {
    await verifyRoot?.(folder.localPath);
    const key = mappingKey(folder), before = journal.before[key] ?? empty(), after = journal.after[key] ?? empty();
    const current = await scan(folder.localPath);
    for (const name of new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(current)])) {
      if (current[name] !== before[name] && current[name] !== after[name]) throw new Error("上次同步尚未应用完成，本地文件又有修改；恢复备份已保留，请处理后重试");
      await safeTarget(folder.localPath, name);
    }
  }
  for (const folder of config.folders) {
    const key = mappingKey(folder), before = journal.before[key] ?? empty(), after = journal.after[key] ?? empty();
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
      await verifyRoot?.(folder.localPath);
      const target = await safeTarget(folder.localPath, name);
      const current = await readFile(target).then((value) => value.toString("base64")).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; });
      if (current === after[name]) continue;
      if (current !== before[name]) throw new Error("应用同步时文件发生变化；恢复备份已保留");
      if (after[name] === undefined) {
        await rm(target);
        if (process.platform !== "win32") {
          const directory = await open(path.dirname(target), "r");
          try { await directory.sync(); } finally { await directory.close(); }
        }
      }
      else {
        await mkdir(path.dirname(target), { recursive: true });
        await safeTarget(folder.localPath, name);
        await durableAtomicWrite(target, Buffer.from(after[name]!, "base64"));
      }
    }
  }
}

export interface GitRepositorySyncOptions {
  storageRoot: string;
  verifyRoot?: (root: string) => Promise<void>;
  /** Fault injection for isolated recovery tests; production does not set this. */
  afterPush?: () => Promise<void>;
}

/** Isolated Git objects/index: remote trees are never checked out into notebook roots. */
export async function syncGitRepository(input: GitRepositoryInput, options: GitRepositorySyncOptions): Promise<GitRepositoryInput> {
  const { config, moves } = planGitLayout(validateGitRepository(input));
  if (!config.folders.length) return config;
  const root = path.join(options.storageRoot, config.id);
  await mkdir(root, { recursive: true, mode: 0o700 });
  await assertRoot(root);
  const work = path.join(root, "worktree");
  await mkdir(work, { recursive: true, mode: 0o700 });
  await assertRoot(work);
  const gitDir = path.join(work, ".git");
  const gitStat = await lstat(gitDir).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
  if (gitStat && (!gitStat.isDirectory() || gitStat.isSymbolicLink())) throw new Error("隔离同步仓库路径无效");
  if (!gitStat) await git(work, ["init", "--initial-branch", config.branch]);
  // All transport uses an explicit validated URL; never honor local rewrite rules.
  const rewrites = await git(work, ["config", "--local", "--includes", "--get-regexp", "^(url\\.|include\\.|includeif\\.)"]).catch(() => "");
  if (rewrites) throw new Error("隔离仓库包含地址改写规则，已停止同步");
  const identity = createHash("sha256").update(`${config.provider}\0${config.remoteUrl}\0${config.branch}\0${config.layout}`).digest("hex");
  const manifestFile = path.join(root, "manifest.json");
  let manifest: Manifest;
  try { manifest = JSON.parse(await readFile(manifestFile, "utf8"), (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.assign(Object.create(null), value) : value); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw Object.assign(new Error("同步恢复记录无法读取，已停止同步"), { cause: error }); manifest = { version: 1, identity, baseline: {} }; }
  if (manifest.version !== 1 || manifest.identity !== identity) throw new Error("仓库身份已变化，请新建同步配置");
  aliasGitLayout(manifest.baseline, moves);
  aliasGitLayout(manifest.pending?.before, moves);
  aliasGitLayout(manifest.pending?.after, moves);
  const local: Snapshots = {};
  for (const folder of config.folders) {
    await options.verifyRoot?.(folder.localPath);
    local[mappingKey(folder)] = await scan(folder.localPath);
  }
  const ref = `refs/heads/${config.branch}`;
  await atomicJson(path.join(root, "local-recovery.json"), local);
  const remoteExists = Boolean(await git(work, ["ls-remote", "--heads", config.remoteUrl, ref]));
  let remoteHead: string | undefined;
  if (remoteExists) {
    await git(work, ["fetch", "--no-tags", "--no-recurse-submodules", config.remoteUrl, ref]);
    remoteHead = await git(work, ["rev-parse", "FETCH_HEAD"]);
  }
  if (manifest.pending) {
    const selectedKeys = new Set(config.folders.map(mappingKey));
    const journal = manifest.pending;
    const reboundAlias = (key: string) => config.folders.some((folder) => {
      const selected = mappingKey(folder);
      return manifest.reboundKeys?.includes(selected) && key.slice(key.indexOf(":") + 1) === folder.remotePath
        && JSON.stringify(journal.before[key]) === JSON.stringify(journal.before[selected])
        && JSON.stringify(journal.after[key]) === JSON.stringify(journal.after[selected]);
    });
    if (Object.keys(journal.after).some((key) => !selectedKeys.has(key) && !reboundAlias(key) && !moves.some((move) => key === `${move.notebookId}:${move.from}`))) throw new Error("上次同步仍有待恢复文件夹，请重新勾选原文件夹并完成同步后再取消选择");
    const pushed = remoteHead && await git(work, ["merge-base", "--is-ancestor", manifest.pending.commit, remoteHead]).then(() => true).catch(() => false);
    if (pushed) {
      await applyJournal(config, manifest.pending, options.verifyRoot);
      manifest.baseline = { ...manifest.baseline, ...manifest.pending.after };
      delete manifest.pending;
      clearReboundKeys(manifest, config.folders);
      await atomicJson(manifestFile, manifest);
      for (const folder of config.folders) local[mappingKey(folder)] = await scan(folder.localPath);
    } else {
      // A rejected push never applied files. Preserve its backup, then recompute against
      // the current remote and last successful baseline instead of replaying stale output.
      await atomicJson(path.join(root, `recovery-${manifest.pending.commit}.json`), manifest.pending);
      delete manifest.pending;
      await atomicJson(manifestFile, manifest);
    }
  }
  const remote: Snapshots = {};
  for (const folder of config.folders) remote[mappingKey(folder)] = empty();
  let metadataPrevious: string | null = null;
  const removedRemoteNames: string[] = [];
  if (remoteHead) {
    const entries = (await gitBytes(work, ["ls-tree", "-r", "-z", remoteHead])).toString("utf8").split("\0").filter(Boolean);
    const metadataEntry = entries.find((entry) => entry.endsWith("\t.goose/sync.json"));
    if (metadataEntry) metadataPrevious = (await gitBytes(work, ["cat-file", "blob", metadataEntry.split("\t")[0]!.split(" ")[2]!])).toString("utf8");
    assertGitLayoutTargets(entries.map((entry) => entry.slice(entry.indexOf("\t") + 1)), metadataPrevious, moves);
    for (const entry of entries) {
      const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
      if (!match) throw new Error("远端 Git 文件树无效");
      const mode = match[1]!, type = match[2]!, oid = match[3]!, name = match[4]!;
      for (const folder of config.folders) {
        const move = moves.find((entry) => entry.notebookId === folder.notebookId);
        const source = move && name.startsWith(`${move.from}/`) ? move.from : folder.remotePath;
        if (move && source === move.from) removedRemoteNames.push(name);
        if (source && name !== source && !name.startsWith(`${source}/`)) {
          const folded = name.normalize("NFC").toLowerCase(), prefix = source.toLowerCase();
          if (folded === prefix || folded.startsWith(`${prefix}/`)) throw new Error("远端目录名称存在大小写冲突，已停止同步");
          continue;
        }
        const relative = source ? name.slice(source.length + 1) : name;
        if (ignored(relative)) continue;
        if (!relative || !safeParts(relative) || type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error("远端所选目录包含符号链接、子模块或不安全路径，已停止同步");
        const bytes = (await gitBytes(work, ["cat-file", "blob", oid])).toString("base64");
        const files = remote[mappingKey(folder)]!;
        if (files[relative] !== undefined && files[relative] !== bytes) throw new Error("目录迁移目标包含不同内容，双方笔记已保留");
        files[relative] = bytes;
      }
    }
  }
  const after: Snapshots = {};
  const activeConflicts = new Set<string>();
  const conflicts: GitSyncConflict[] = [];
  for (const folder of config.folders) {
    const key = mappingKey(folder);
    assertTree(remote[key]!);
    after[key] = reconcileFiles(manifest.reboundKeys?.includes(key) ? undefined : manifest.baseline[key], local[key]!, remote[key]!, {
      repositoryId: config.id, identity, folder, active: activeConflicts, unresolved: conflicts,
    });
    after[key] = retainDeletedGitFiles(manifest.baseline[key], local[key]!, remote[key]!, after[key]!);
  }
  retainGitConflicts(config.id, activeConflicts);
  if (conflicts.length) throw new GitConflictError(conflicts);
  for (const folder of config.folders) {
    const key = mappingKey(folder);
    assertTree(after[key]!);
    // Catch file/directory collisions and unsafe ancestors before creating/pushing a commit.
    for (const name of new Set([...Object.keys(local[key]!), ...Object.keys(after[key]!)])) await safeTarget(folder.localPath, name);
  }
  await git(work, remoteHead ? ["read-tree", remoteHead] : ["read-tree", "--empty"]);
  const blobFile = path.join(root, "blob");
  for (const name of removedRemoteNames) await git(work, ["update-index", "--force-remove", "--", name]);
  for (const folder of config.folders) {
    const key = mappingKey(folder);
    for (const name of new Set([...Object.keys(remote[key]!), ...Object.keys(after[key]!)])) {
      if (after[key]![name] === remote[key]![name] && !moves.some((move) => move.notebookId === folder.notebookId)) continue;
      const destination = remoteName(folder, name);
      if (after[key]![name] === undefined) await git(work, ["update-index", "--force-remove", "--", destination]);
      else {
        await writeFile(blobFile, Buffer.from(after[key]![name]!, "base64"), { mode: 0o600 });
        const oid = await git(work, ["hash-object", "-w", "--no-filters", "--", blobFile]);
        await git(work, ["update-index", "--add", "--cacheinfo", "100644", oid, destination]);
      }
    }
  }
  if (config.layout === "subfolders") {
    await writeFile(blobFile, gitLayoutMetadata(metadataPrevious, config, moves), { mode: 0o600 });
    const metadataOid = await git(work, ["hash-object", "-w", "--no-filters", "--", blobFile]);
    await git(work, ["update-index", "--add", "--cacheinfo", "100644", metadataOid, ".goose/sync.json"]);
  }
  await rm(blobFile, { force: true });
  const tree = await git(work, ["write-tree"]);
  const unchanged = remoteHead && await git(work, ["rev-parse", `${remoteHead}^{tree}`]) === tree;
  const description = unchanged ? "" : describeGitSyncChanges((await gitBytes(work, ["diff", "--cached", "--name-status", "-z", "-M", ...(remoteHead ? [remoteHead] : []), "--"])).toString("utf8"));
  const commit = unchanged ? remoteHead! : await git(work, ["commit-tree", tree, ...(remoteHead ? ["-p", remoteHead] : []), "-m", description]);
  await git(work, ["update-ref", "refs/heads/goose-local", commit]);
  manifest.pending = { commit, before: local, after };
  await atomicJson(manifestFile, manifest);
  if (!unchanged) {
    try { await git(work, ["push", "--no-verify", config.remoteUrl, `${commit}:${ref}`]); }
    catch (error) { throw Object.assign(new Error(`推送失败，本地内容与恢复备份已保留。${error instanceof Error ? error.message : "请检查 SSH 权限与网络后重试"}`), { cause: error }); }
  }
  await options.afterPush?.();
  await applyJournal(config, manifest.pending, options.verifyRoot);
  manifest.baseline = { ...manifest.baseline, ...after };
  delete manifest.pending;
  clearReboundKeys(manifest, config.folders);
  await atomicJson(manifestFile, manifest);
  retainGitConflicts(config.id, new Set());
  return config;
}
