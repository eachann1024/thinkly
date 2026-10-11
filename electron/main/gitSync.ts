import { app, BrowserWindow, ipcMain, Notification } from "electron";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { normalizedGitRemote, validateGitRepository, validateRepositoryId, type GitConflictResolution, type GitRepositoryConfig, type GitRepositoryInput, type GitSyncState, type GitSyncStatus } from "../../src/lib/git-sync-contract";
import { normalizePath } from "./allowlist";
import { broadcast, lookupWindowContext } from "./windows";
import { syncGitRepository, validateGitSyncFolder, GitConflictError, getGitConflict, resolveGitConflict } from "./gitRepositoryEngine";
import { retainGitConflicts } from "./gitSyncConflict";
import { checkedGitRoot as checkedRoot, checkGitFolder } from "./gitSyncFolders";
import { rebindGitFolder } from "./gitSyncRebind";
import { lockGitSyncPath } from "./gitSyncLock";
import { GitSyncSerialQueue, migrateGitSyncState, type GitMappingHistory } from "./gitSyncStore";
import { durableAtomicWrite } from "./gitSyncDisk";

const configs = new Map<string, GitRepositoryConfig>();
const statuses = new Map<string, GitSyncStatus>();
const nextRun = new Map<string, number>();
const notifications = new Map<string, string>();
const queue = new GitSyncSerialQueue();
let mappingHistory: GitMappingHistory = Object.create(null);
const pendingReplies = new Map<string, { senderId: number; finish: (error: string | null) => void }>();
let stopped = false;
let ticking = false;
let timer: NodeJS.Timeout | undefined;
let loadPromise: Promise<void> | undefined;
const configFile = () => path.join(app.getPath("userData"), "git-sync.json");
const idle = (repositoryId: string): GitSyncStatus => ({ repositoryId, phase: "idle", lastSyncedAt: null, error: null });
const state = (): GitSyncState => structuredClone({ configs: [...configs.values()], statuses: [...statuses.values()] });
const publish = () => broadcast("git-sync:state", state());
const messageOf = (error: unknown) => error instanceof Error && /^[\u3400-\u9fff]/.test(error.message) ? error.message.slice(0, 500) : "同步操作失败，请检查文件夹、SSH 权限和网络后重试";

function notifyFailure(id: string, message: string) {
  if (notifications.get(id) === message) return;
  notifications.set(id, message);
  if (Notification.isSupported()) new Notification({ title: "鹅的笔记 · Git 同步异常", body: message.slice(0, 400) }).show();
}

async function atomic(file: string, value: unknown) {
  await mkdir(app.getPath("userData"), { recursive: true });
  await durableAtomicWrite(file, JSON.stringify(value, null, 2));
}

async function load() {
  if (!loadPromise) loadPromise = (async () => {
    try {
      const saved = migrateGitSyncState(JSON.parse(await readFile(configFile(), "utf8")));
      mappingHistory = saved.mappingHistory;
      for (const config of saved.configs) { configs.set(config.id, config); nextRun.set(config.id, Date.now() + config.intervalMinutes * 60_000); }
      for (const status of saved.statuses) statuses.set(status.repositoryId, status);
      await persist();
    } catch (error) {
      configs.clear(); statuses.clear();
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw Object.assign(new Error("无法读取 Git 同步配置，已停止同步以保护现有文件"), { cause: error });
    }
    // Retired privacy credentials are no longer read or used. Cleanup must not block SSH sync.
    await rm(path.join(app.getPath("userData"), "git-sync-tokens.json"), { force: true }).catch(() => undefined);
  })();
  return loadPromise;
}

async function persist() {
  await atomic(configFile(), { version: 2, ...state(), mappingHistory });
}

function assertWorkspace(event: Electron.IpcMainInvokeEvent) {
  if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") throw new Error("请从笔记工作区操作 Git 同步");
}

function prepareWindow(win: BrowserWindow, roots: string[], requestId: string) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish("工作区未响应，已跳过同步；请等待窗口加载完成后重试"), 20_000);
    const finish = (error: string | null) => {
      clearTimeout(timeout); pendingReplies.delete(requestId);
      win.webContents.removeListener("destroyed", destroyed);
      if (error) reject(new Error("工作区未能保存全部笔记，已停止同步；请检查未保存内容后重试")); else resolve();
    };
    const destroyed = () => finish("工作区已关闭");
    win.webContents.once("destroyed", destroyed);
    pendingReplies.set(requestId, { senderId: win.webContents.id, finish });
    try { win.webContents.send("git-sync:prepare", requestId, roots); }
    catch { finish("工作区已关闭"); }
  });
}

async function sync(repositoryId: string): Promise<GitSyncState> {
  const found = configs.get(repositoryId);
  if (!found) throw new Error("请先保存同步配置");
  const config = structuredClone(found);
  if ([...configs.values()].some((other) => other.id !== config.id && normalizedGitRemote(other) === normalizedGitRemote(config) && other.branch === config.branch)) throw new Error("多个配置指向同一仓库分支，请先移除重复配置");
  statuses.set(repositoryId, { ...(statuses.get(repositoryId) ?? idle(repositoryId)), phase: "syncing", error: null }); publish();
  const unlocks: (() => void)[] = [];
  const roots: string[] = [];
  const prepared: { win: BrowserWindow; requestId: string }[] = [];
  try {
    for (const folder of config.folders) { folder.localPath = await checkedRoot(folder.localPath); roots.push(folder.localPath); }
    const windows = BrowserWindow.getAllWindows().filter((win) => lookupWindowContext(win)?.kind === "workspace");
    if (!windows.length && roots.length) throw new Error("请保持笔记工作区打开以进行同步");
    const requests = windows.map((win) => ({ win, requestId: randomUUID() }));
    prepared.push(...requests);
    const results = await Promise.allSettled(requests.map(({ win, requestId }) => prepareWindow(win, roots, requestId)));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    for (const root of roots) unlocks.push(lockGitSyncPath(root));
    await syncGitRepository(config, { storageRoot: path.join(app.getPath("userData"), "git-sync-repositories"), verifyRoot: async (root) => { await checkedRoot(root); } });
    statuses.set(repositoryId, { repositoryId, phase: "idle", lastSyncedAt: new Date().toISOString(), error: null });
    await persist(); notifications.delete(repositoryId);
  } catch (error) {
    const message = messageOf(error);
    statuses.set(repositoryId, { ...(statuses.get(repositoryId) ?? idle(repositoryId)), phase: "error", error: message, conflicts: error instanceof GitConflictError ? [...error.conflicts] : undefined });
    notifyFailure(repositoryId, message);
  } finally {
    unlocks.reverse().forEach((unlock) => unlock());
    for (const { win, requestId } of prepared) if (!win.isDestroyed()) win.webContents.send("git-sync:finish", requestId);
    for (const root of roots) broadcast("desktop:fs-change", { path: root, type: "rename" });
    nextRun.set(repositoryId, Date.now() + config.intervalMinutes * 60_000); publish();
  }
  return state();
}

async function tick() {
  if (ticking || stopped) return;
  ticking = true;
  try {
    await queue.run(async () => {
      await load(); if (stopped) return;
      const due = [...configs.values()].find((config) => config.enabled && config.folders.length && (nextRun.get(config.id) ?? 0) <= Date.now());
      if (due) await sync(due.id);
    });
  } catch (error) { notifyFailure("scheduler", messageOf(error)); }
  finally { ticking = false; }
}

export function startGitSync() {
  stopped = false; timer = setInterval(() => { void tick(); }, 5000); timer.unref();
  void queue.run(load).catch((error) => notifyFailure("scheduler", messageOf(error)));
}
export function stopGitSync() { stopped = true; clearInterval(timer); }

async function save(raw: GitRepositoryInput) {
  let input = validateGitRepository(raw);
  const previous = configs.get(input.id);
  if (previous) {
    const manifest = await readFile(path.join(app.getPath("userData"), "git-sync-repositories", input.id, "manifest.json"), "utf8").then((value) => JSON.parse(value)).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw new Error("无法读取同步恢复记录"); });
    if (manifest?.pending && JSON.stringify(input.folders.map((folder) => [folder.notebookId, folder.localPath])) !== JSON.stringify(previous.folders.map((folder) => [folder.notebookId, folder.localPath]))) throw new Error("上次同步尚未恢复完成，请先同步原文件夹再修改选择");
  }
  if (previous && (normalizedGitRemote(input) !== normalizedGitRemote(previous) || input.branch !== previous.branch || input.layout !== previous.layout)) throw new Error("已保存仓库的地址、分支和布局不可修改；请新建配置");
  if (!previous && input.layout === "legacy-root") throw new Error("新仓库必须使用子目录布局");
  if ([...configs.values()].some((other) => other.id !== input.id && normalizedGitRemote(other) === normalizedGitRemote(input) && other.branch === input.branch)) throw new Error("此仓库分支已有同步配置");
  const addsFolder = input.folders.some((folder) => !previous?.folders.some((old) => old.notebookId === folder.notebookId));
  const history = mappingHistory[input.id] ?? [];
  for (const folder of input.folders) {
    if (addsFolder) {
      folder.localPath = await checkedRoot(folder.localPath);
      await validateGitSyncFolder(folder.localPath);
    }
    const old = history.find((entry) => entry.notebookId === folder.notebookId || normalizePath(entry.localPath).toLowerCase() === normalizePath(folder.localPath).toLowerCase());
    if (old) {
      if (old.notebookId !== folder.notebookId || normalizePath(old.localPath) !== normalizePath(folder.localPath)) throw new Error("原文件夹身份或路径已变化，请创建新的映射");
      folder.remotePath = old.remotePath;
    }
    if (history.some((entry) => entry.notebookId !== folder.notebookId && entry.remotePath.toLowerCase() === folder.remotePath.toLowerCase())) throw new Error("此远端子目录已保留给其他笔记本，请使用新名称");
  }
  input = validateGitRepository(input);
  if (input.layout === "legacy-root" && input.folders.some((folder) => !history.some((old) => old.notebookId === folder.notebookId && old.localPath === folder.localPath))) throw new Error("旧布局只能重新选择原文件夹");
  input = { ...input, remoteUrl: previous?.remoteUrl ?? input.remoteUrl };
  const added = input.folders.some((folder) => !previous?.folders.some((old) => old.notebookId === folder.notebookId));
  const config: GitRepositoryConfig = input;
  const previousHistory = mappingHistory[input.id];
  const previousStatus = statuses.get(input.id);
  configs.set(input.id, config);
  mappingHistory[input.id] = [...history.filter((old) => !input.folders.some((folder) => folder.notebookId === old.notebookId)), ...input.folders];
  statuses.set(input.id, previousStatus ?? idle(input.id));
  try { await persist(); }
  catch (error) {
    if (previous) configs.set(input.id, previous); else configs.delete(input.id);
    if (previousHistory) mappingHistory[input.id] = previousHistory; else delete mappingHistory[input.id];
    if (previousStatus) statuses.set(input.id, previousStatus); else statuses.delete(input.id);
    throw error;
  }
  nextRun.set(input.id, Date.now() + input.intervalMinutes * 60_000); publish();
  // This runs inside the same serialized operation: saving a newly selected folder always
  // gets its own sync attempt, including while automatic sync is disabled.
  return added ? sync(input.id) : state();
}

export function registerGitSyncIpc() {
  ipcMain.handle("git-sync:check-folder", async (event, localPath: unknown) => {
    assertWorkspace(event);
    return checkGitFolder(localPath);
  });
  ipcMain.on("git-sync:prepare-reply", (event, requestId: string, error: string | null) => {
    if (typeof requestId !== "string") return;
    const pending = pendingReplies.get(requestId);
    if (!pending || event.sender.id !== pending.senderId || event.senderFrame !== event.sender.mainFrame) return;
    pending.finish(error === null ? null : "工作区无法保存，已停止同步");
  });
  const handle = (channel: string, operation: (value: never) => Promise<unknown>) => {
    ipcMain.handle(channel, async (event, value) => {
      assertWorkspace(event);
      // Deliberately drop the cause at IPC: native errors can contain paths or credentials.
      // eslint-disable-next-line preserve-caught-error
      return queue.run(async () => { try { await load(); return await operation(value as never); } catch (error) { throw new Error(messageOf(error)); } });
    });
  };
  handle("git-sync:state", async () => state());
  handle("git-sync:save", save);
  handle("git-sync:now", async (value) => sync(validateRepositoryId(value)));
  handle("git-sync:rebind", async (request) => sync(await rebindGitFolder(request, { configs, mappingHistory, storageRoot: path.join(app.getPath("userData"), "git-sync-repositories"), persist, publish })));
  handle("git-sync:conflict", async (request: { repositoryId: string; conflictId: string }) => {
    const id = validateRepositoryId(request?.repositoryId);
    if (!configs.has(id) || typeof request.conflictId !== "string" || !/^[a-f0-9]{64}$/.test(request.conflictId)) throw new Error("冲突记录无效，请重新同步");
    return getGitConflict(id, request.conflictId);
  });
  handle("git-sync:resolve-conflict", async (request: GitConflictResolution) => {
    const id = validateRepositoryId(request?.repositoryId);
    if (!configs.has(id)) throw new Error("同步配置已移除");
    await resolveGitConflict(request);
    return sync(id);
  });
  handle("git-sync:remove", async (value) => {
    const id = validateRepositoryId(value), previous = configs.get(id), previousStatus = statuses.get(id);
    configs.delete(id); statuses.delete(id);
    try { await persist(); }
    catch (error) { if (previous) configs.set(id, previous); if (previousStatus) statuses.set(id, previousStatus); throw error; }
    // Retain notebook files, remote files, mapping identity and recovery data.
    nextRun.delete(id); notifications.delete(id); retainGitConflicts(id, new Set()); publish(); return state();
  });
}
