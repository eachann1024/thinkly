import { app, BrowserWindow, ipcMain, Notification } from "electron";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateGitSyncConfig, type GitSyncConfig, type GitSyncState, type GitSyncStatus } from "../../src/lib/git-sync-contract";
import { assertAllowed, findVaultRootContaining, normalizePath } from "./allowlist";
import { broadcast, lookupWindowContext } from "./windows";
import { syncGitNotebook } from "./gitSyncEngine";
import { lockGitSyncPath } from "./gitSyncLock";

const configs = new Map<string, GitSyncConfig>();
const statuses = new Map<string, GitSyncStatus>();
const nextRun = new Map<string, number>();
const notifications = new Map<string, string>();
const pendingReplies = new Map<string, { senderId: number; finish: (error: string | null) => void }>();
let active = false;
let configuring = false;
let stopped = false;
let timer: NodeJS.Timeout | undefined;
let loadPromise: Promise<void> | undefined;
const configFile = () => path.join(app.getPath("userData"), "git-sync.json");
const idle = (notebookId: string): GitSyncStatus => ({ notebookId, phase: "idle", lastSyncedAt: null, error: null });
const state = (): GitSyncState => ({ configs: [...configs.values()], statuses: [...statuses.values()] });
const publish = () => broadcast("git-sync:state", state());
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

function notifyFailure(id: string, message: string) {
  if (notifications.get(id) === message) return;
  notifications.set(id, message);
  if (Notification.isSupported()) new Notification({ title: "鹅的笔记 · Git 同步异常", body: message.slice(0, 400) }).show();
}

async function load() {
  if (!loadPromise) loadPromise = (async () => {
    try {
      const saved = JSON.parse(await readFile(configFile(), "utf8"));
      if (!Array.isArray(saved.configs)) throw new Error("同步配置文件格式无效");
      for (const raw of saved.configs) {
        const config = validateGitSyncConfig(raw);
        configs.set(config.notebookId, config);
        const last = saved.statuses?.find((item: GitSyncStatus) => item.notebookId === config.notebookId);
        statuses.set(config.notebookId, { ...idle(config.notebookId), lastSyncedAt: typeof last?.lastSyncedAt === "string" ? last.lastSyncedAt : null });
        nextRun.set(config.notebookId, Date.now() + 15_000);
      }
    } catch (error) {
      configs.clear();
      statuses.clear();
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        loadPromise = undefined;
        throw Object.assign(new Error(`无法读取 Git 同步配置：${messageOf(error)}`), { cause: error });
      }
    }
  })();
  return loadPromise;
}

async function persist() {
  await mkdir(app.getPath("userData"), { recursive: true });
  const temporary = `${configFile()}.tmp`;
  await writeFile(temporary, JSON.stringify(state(), null, 2), { mode: 0o600 });
  await rename(temporary, configFile());
}

function assertWorkspace(event: Electron.IpcMainInvokeEvent) {
  if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") throw new Error("请从笔记工作区操作 Git 同步");
}

async function checkedRoot(config: GitSyncConfig) {
  const allowed = assertAllowed(config.localPath);
  const root = await realpath(allowed);
  assertAllowed(root);
  const vault = findVaultRootContaining(root);
  if (!vault || normalizePath(await realpath(vault)) !== normalizePath(root)) throw new Error("只能同步已打开记事本的根文件夹");
  return root;
}

function prepareWindow(win: BrowserWindow, root: string, requestId: string) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish("工作区未响应，已跳过同步；请等待窗口加载完成后重试"), 20_000);
    const finish = (error: string | null) => {
      clearTimeout(timeout);
      pendingReplies.delete(requestId);
      if (error) reject(new Error(error)); else resolve();
    };
    pendingReplies.set(requestId, { senderId: win.webContents.id, finish });
    win.webContents.send("git-sync:prepare", requestId, root);
  });
}

async function sync(notebookId: string): Promise<GitSyncState> {
  if (active || configuring) throw new Error("正在同步或保存配置，请稍后重试");
  const config = configs.get(notebookId);
  if (!config) throw new Error("请先保存同步配置");
  active = true;
  statuses.set(notebookId, { ...(statuses.get(notebookId) ?? idle(notebookId)), phase: "syncing", error: null });
  publish();
  let unlock: (() => void) | undefined;
  let root: string | undefined;
  const prepared: { win: BrowserWindow; requestId: string }[] = [];
  try {
    root = await checkedRoot(config);
    const windows = BrowserWindow.getAllWindows().filter((win) => lookupWindowContext(win)?.kind === "workspace");
    if (!windows.length) throw new Error("请保持笔记工作区打开以进行同步");
    for (const win of windows) prepared.push({ win, requestId: randomUUID() });
    const results = await Promise.allSettled(prepared.map(({ win, requestId }) => prepareWindow(win, root!, requestId)));
    const failure = results.find((item) => item.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    unlock = lockGitSyncPath(root);
    await syncGitNotebook({ ...config, localPath: root });
    statuses.set(notebookId, { notebookId, phase: "idle", lastSyncedAt: new Date().toISOString(), error: null });
    await persist();
    notifications.delete(notebookId);
  } catch (error) {
    const message = messageOf(error);
    statuses.set(notebookId, { ...(statuses.get(notebookId) ?? idle(notebookId)), phase: "error", error: message });
    notifyFailure(notebookId, message);
  } finally {
    unlock?.();
    for (const { win, requestId } of prepared) if (!win.isDestroyed()) win.webContents.send("git-sync:finish", requestId);
    if (root) broadcast("desktop:fs-change", { path: root, type: "rename" });
    nextRun.set(notebookId, Date.now() + config.intervalMinutes * 60_000);
    active = false;
    publish();
  }
  return state();
}

async function tick() {
  if (active || configuring || stopped) return;
  try {
    await load();
    if (active || configuring || stopped) return;
    const due = [...configs.values()].find((config) => config.enabled && (nextRun.get(config.notebookId) ?? 0) <= Date.now());
    if (due) await sync(due.notebookId);
  } catch (error) { notifyFailure("scheduler", messageOf(error)); }
}

export function startGitSync() {
  stopped = false;
  timer = setInterval(() => { void tick(); }, 5000);
  timer.unref();
  void load().catch((error) => notifyFailure("scheduler", messageOf(error)));
}

export function stopGitSync() {
  stopped = true;
  clearInterval(timer);
}

export function registerGitSyncIpc() {
  ipcMain.on("git-sync:prepare-reply", (event, requestId: string, error: string | null) => {
    const pending = pendingReplies.get(requestId);
    if (!pending || event.sender.id !== pending.senderId || event.senderFrame !== event.sender.mainFrame) return;
    pending.finish(error === null ? null : typeof error === "string" ? error : "工作区无法保存，已停止同步");
  });
  ipcMain.handle("git-sync:state", async (event) => { assertWorkspace(event); await load(); return state(); });
  ipcMain.handle("git-sync:save", async (event, raw: GitSyncConfig) => {
    assertWorkspace(event);
    await load();
    if (active || configuring) throw new Error("正在同步或保存配置，请稍后重试");
    configuring = true;
    const before = new Map(configs);
    try {
      const config = validateGitSyncConfig(raw);
      config.localPath = await checkedRoot(config);
      if ([...configs.values()].some((other) => other.notebookId !== config.notebookId && normalizePath(other.localPath) === normalizePath(config.localPath))) throw new Error("此文件夹已有同步配置");
      configs.set(config.notebookId, config);
      await persist();
      statuses.set(config.notebookId, idle(config.notebookId));
      notifications.delete(config.notebookId);
      nextRun.set(config.notebookId, Date.now() + 1000);
      publish();
      return state();
    } catch (error) {
      configs.clear(); before.forEach((value, key) => configs.set(key, value));
      throw error;
    } finally { configuring = false; }
  });
  ipcMain.handle("git-sync:remove", async (event, notebookId: string) => {
    assertWorkspace(event); await load();
    if (active || configuring) throw new Error("正在同步或保存配置，请稍后重试");
    configuring = true;
    const previous = configs.get(notebookId);
    try {
      configs.delete(notebookId);
      await persist();
      statuses.delete(notebookId); nextRun.delete(notebookId); notifications.delete(notebookId);
      publish(); return state();
    } catch (error) { if (previous) configs.set(notebookId, previous); throw error; }
    finally { configuring = false; }
  });
  ipcMain.handle("git-sync:now", async (event, notebookId: string) => { assertWorkspace(event); await load(); return sync(notebookId); });
}
