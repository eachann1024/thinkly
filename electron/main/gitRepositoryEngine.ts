import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateGitRepository, type GitRepositoryInput, type GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { gitBytes } from "./gitSyncEngine";
import { durableAtomicWrite } from "./gitSyncDisk";
import { GitConflictError, retainGitConflicts, type GitSyncConflict } from "./gitSyncConflict";
import { reconcileFiles } from "./gitSyncReconcile";
export { GitConflictError, getGitConflict, resolveGitConflict } from "./gitSyncConflict";

type Files = Record<string, string>; // base64 bytes; snapshots are also recovery backups.
type Snapshots = Record<string, Files>;
interface Journal { commit: string; before: Snapshots; after: Snapshots }
interface Manifest { version: 1; identity: string; baseline: Snapshots; pending?: Journal; reboundKeys?: string[] }
const excluded = new Set([".git", ".ds_store", "thumbs.db", "desktop.ini", ".cache", "node_modules", ".goose-cache"]);
const git = async (root: string, args: string[]) => (await gitBytes(root, args)).toString("utf8").trim();
const empty = (): Files => Object.create(null) as Files;
const safeParts = (name: string) => name.split("/").every((part) => part && part !== "." && part !== ".." && !/[\\\0\r\n:]/.test(part) && !/[. ]$/.test(part) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
const ignored = (name: string) => name.split("/").some((part) => excluded.has(part.toLowerCase()) || part.startsWith(".goose-sync-"));
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

async function assertRoot(root: string) {
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) throw new Error("同步文件夹已移动、缺失或包含符号链接，已停止同步");
}

async function scan(root: string, readContents = true): Promise<Files> {
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

function assertTree(files: Files) {
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

export function reconcileGitFiles(base: Files | undefined, local: Files, remote: Files): Files {
  const merged = reconcileFiles(base, local, remote);
  assertTree(merged);
  return merged;
}

async function safeTarget(root: string, name: string) {
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
export async function syncGitRepository(input: GitRepositoryInput, options: GitRepositorySyncOptions): Promise<void> {
  const config = validateGitRepository(input);
  if (!config.folders.length) return;
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
    if (Object.keys(journal.after).some((key) => !selectedKeys.has(key) && !reboundAlias(key))) throw new Error("上次同步仍有待恢复文件夹，请重新勾选原文件夹并完成同步后再取消选择");
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
  if (remoteHead) {
    const entries = (await gitBytes(work, ["ls-tree", "-r", "-z", remoteHead])).toString("utf8").split("\0").filter(Boolean);
    for (const entry of entries) {
      const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
      if (!match) throw new Error("远端 Git 文件树无效");
      const mode = match[1]!, type = match[2]!, oid = match[3]!, name = match[4]!;
      for (const folder of config.folders) {
        if (folder.remotePath && name !== folder.remotePath && !name.startsWith(`${folder.remotePath}/`)) {
          const folded = name.normalize("NFC").toLowerCase(), prefix = folder.remotePath.normalize("NFC").toLowerCase();
          if (folded === prefix || folded.startsWith(`${prefix}/`)) throw new Error("远端目录名称存在大小写冲突，已停止同步");
          continue;
        }
        const relative = folder.remotePath ? name.slice(folder.remotePath.length + 1) : name;
        if (ignored(relative)) continue;
        if (!relative || !safeParts(relative) || type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error("远端所选目录包含符号链接、子模块或不安全路径，已停止同步");
        remote[mappingKey(folder)]![relative] = (await gitBytes(work, ["cat-file", "blob", oid])).toString("base64");
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
  for (const folder of config.folders) {
    const key = mappingKey(folder);
    for (const name of new Set([...Object.keys(remote[key]!), ...Object.keys(after[key]!)])) {
      if (after[key]![name] === remote[key]![name]) continue;
      const destination = remoteName(folder, name);
      if (after[key]![name] === undefined) await git(work, ["update-index", "--force-remove", "--", destination]);
      else {
        await writeFile(blobFile, Buffer.from(after[key]![name]!, "base64"), { mode: 0o600 });
        const oid = await git(work, ["hash-object", "-w", "--no-filters", "--", blobFile]);
        await git(work, ["update-index", "--add", "--cacheinfo", "100644", oid, destination]);
      }
    }
  }
  await rm(blobFile, { force: true });
  const tree = await git(work, ["write-tree"]);
  const unchanged = remoteHead && await git(work, ["rev-parse", `${remoteHead}^{tree}`]) === tree;
  const commit = unchanged ? remoteHead! : await git(work, ["commit-tree", tree, ...(remoteHead ? ["-p", remoteHead] : []), "-m", "同步笔记"]);
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
}
