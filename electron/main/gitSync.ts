import { localizeSavedGitError } from "./i18n/savedGitErrors";
import { isGitMessage } from "../../src/lib/git-messages";
import { t } from "./i18n/gitSyncMessages";
import { isDesktopMessage } from "./i18n/messages";
import { getLocale } from "../../src/i18n/core";
import { app, BrowserWindow, ipcMain, Notification } from "electron";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { normalizedGitRemote, validateGitRepository, validateRepositoryId, type GitConflictResolution, type GitRepositoryConfig, type GitRepositoryInput, type GitSyncState, type GitSyncStatus } from "../../src/lib/git-sync-contract";
import { idleGitSyncStatus as idle, gitSyncStatusTransition } from "../../src/lib/git-sync-status";
import { gitSchedulerTransition, gitLoadTransition, type GitSchedulerState, type GitLoadState } from "./gitSyncLifecycle";
import { gitSyncPreparationFailure, isGitPreparationMessage } from "../../src/lib/git-sync-preparation";
import { broadcast, lookupWindowContext } from "./windows";
import { syncGitRepository, GitConflictError, getGitConflict, resolveGitConflict } from "./gitRepositoryEngine";
import { retainGitConflicts } from "./gitSyncConflict";
import { checkedGitRoot as checkedRoot, checkGitFolder, rememberNotebookRoot } from "./gitSyncFolders";
import { rebindGitFolder } from "./gitSyncRebind";
import { lockGitSyncPath } from "./gitSyncLock";
import { gitExecutable, gitProbeSettled, probeGitBinary } from "./gitBinary";
import { t as gitError } from "./i18n/gitErrors";
import { GitSyncSerialQueue, migrateGitSyncState, type GitMappingHistory } from "./gitSyncStore";
import { durableAtomicWrite } from "./gitSyncDisk";
import { prepareGitFolderMappings, sameGitFolderTargets } from "./gitSyncMappings";
import { finishNotebookRenameIntent, renameGitTrackedNotebookFolder, type NotebookRetargetContext } from "./gitSyncRetarget";
import { readFinishedNotebookRenameIntent } from "./gitSyncRenameIntent";
import { adoptRenamedNotebookFolder } from "./notebookFolderAdopt";

const configs = new Map<string, GitRepositoryConfig>();
const statuses = new Map<string, GitSyncStatus>();
const nextRun = new Map<string, number>();
const notifications = new Map<string, string>();
const queue = new GitSyncSerialQueue();
let mappingHistory: GitMappingHistory = Object.create(null);
let moduleEnabled = false;
const pendingReplies = new Map<string, { senderId: number; finish: (error: string | null) => void }>();
let scheduler: GitSchedulerState = { phase: "stopped" };
let loading: GitLoadState = { phase: "unread" };
let timer: NodeJS.Timeout | undefined;
let loadPromise: Promise<void> | undefined;
const configFile = () => path.join(app.getPath("userData"), "git-sync.json");
const rawState = (): GitSyncState => structuredClone({ configs: [...configs.values()], statuses: [...statuses.values()], mappingHistory, moduleEnabled });
const state = (): GitSyncState => {
  const view = rawState();
  for (const status of view.statuses) if (status.error) status.error = localizeSavedGitError(status.error);
  return view;
};
const publish = () => broadcast("git-sync:state", state());
const messageOf = (error: unknown) => error instanceof Error && (isDesktopMessage(error.message) || isGitMessage(error.message) || isGitPreparationMessage(error.message) || (getLocale() === "zh-Hans" && /^[\u3400-\u9fff]/.test(error.message))) ? error.message.slice(0, 500) : t("failed");

function notifyFailure(id: string, message: string) {
  if (notifications.get(id) === message) return;
  notifications.set(id, message);
  if (Notification.isSupported()) new Notification({ title: t("notification"), body: message.slice(0, 400) }).show();
}

async function atomic(file: string, value: unknown) {
  await mkdir(app.getPath("userData"), { recursive: true });
  await durableAtomicWrite(file, JSON.stringify(value, null, 2));
}

async function load() {
  if (loading.phase === "ready") return;
  if (!loadPromise) {
    loading = gitLoadTransition(loading, "load.started");
    loadPromise = (async () => {
      try {
        const saved = migrateGitSyncState(JSON.parse(await readFile(configFile(), "utf8")));
        moduleEnabled = saved.moduleEnabled;
        mappingHistory = saved.mappingHistory;
        for (const config of saved.configs) { configs.set(config.id, config); nextRun.set(config.id, Date.now() + config.intervalMinutes * 60_000); }
        for (const status of saved.statuses) statuses.set(status.repositoryId, status);
        const intent = await readFinishedNotebookRenameIntent(app.getPath("userData")).catch(() => null);
        if (intent) {
          try { await finishNotebookRenameIntent(retargetContext(), intent); }
          catch (error) { console.error("[git-sync] rename recovery failed", error); }
        }
        await persist();
      } catch (error) {
        configs.clear(); statuses.clear(); nextRun.clear(); mappingHistory = Object.create(null); moduleEnabled = false;
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw Object.assign(new Error(t("configUnreadable")), { cause: error });
      }
      await rm(path.join(app.getPath("userData"), "git-sync-tokens.json"), { force: true }).catch(() => undefined);
      loading = gitLoadTransition(loading, "load.succeeded");
    })().catch((error) => {
      loadPromise = undefined;
      loading = gitLoadTransition(loading, "load.failed");
      throw error;
    });
  }
  return loadPromise;
}

function retargetContext(): NotebookRetargetContext {
  return { configs, mappingHistory, persist, publish, userData: app.getPath("userData") };
}

async function persist() {
  await atomic(configFile(), { version: 2, ...rawState(), mappingHistory });
}

function assertWorkspace(event: Electron.IpcMainInvokeEvent) {
  if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") throw new Error(t("workspaceOnly"));
}

function prepareWindow(win: BrowserWindow, roots: string[], requestId: string) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(t("saveTimeout")), 120_000);
    const finish = (error: string | null) => {
      clearTimeout(timeout); pendingReplies.delete(requestId);
      win.webContents.removeListener("destroyed", destroyed);
      if (error) reject(new Error(error)); else resolve();
    };
    const destroyed = () => finish(t("windowClosed"));
    win.webContents.once("destroyed", destroyed);
    pendingReplies.set(requestId, { senderId: win.webContents.id, finish });
    try { win.webContents.send("git-sync:prepare", requestId, roots); }
    catch { finish(t("windowClosed")); }
  });
}

async function sync(repositoryId: string): Promise<GitSyncState> {
  if (!moduleEnabled) throw new Error(t("moduleOff"));
  if (!gitProbeSettled()) await probeGitBinary();
  if (!gitExecutable()) throw new Error(gitError("gitMissing"));
  const found = configs.get(repositoryId);
  if (!found) throw new Error(t("saveFirst"));
  const config = structuredClone(found);
  if ([...configs.values()].some((other) => other.id !== config.id && normalizedGitRemote(other) === normalizedGitRemote(config) && other.branch === config.branch)) throw new Error(t("duplicateConfigs"));
  statuses.set(repositoryId, gitSyncStatusTransition(statuses.get(repositoryId) ?? idle(repositoryId), { type: "sync.started" })); publish();
  const unlocks: (() => void)[] = [];
  const roots: string[] = [];
  const prepared: { win: BrowserWindow; requestId: string }[] = [];
  try {
    for (const folder of config.folders) {
      await rememberNotebookRoot(folder.localPath);
      folder.localPath = await checkedRoot(folder.localPath);
      roots.push(folder.localPath);
    }
    const windows = BrowserWindow.getAllWindows().filter((win) => lookupWindowContext(win)?.kind === "workspace");
    if (!windows.length && roots.length) throw new Error(t("keepWorkspaceOpen"));
    const requests = windows.map((win) => ({ win, requestId: randomUUID() }));
    prepared.push(...requests);
    const results = await Promise.allSettled(requests.map(({ win, requestId }) => prepareWindow(win, roots, requestId)));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    for (const root of roots) unlocks.push(lockGitSyncPath(root));
    const synchronized = await syncGitRepository(config, { storageRoot: path.join(app.getPath("userData"), "git-sync-repositories"), verifyRoot: async (root) => { await checkedRoot(root); } });
    configs.set(repositoryId, synchronized);
    const selected = new Set(synchronized.folders.map((folder) => folder.notebookId));
    mappingHistory[repositoryId] = [...(mappingHistory[repositoryId] ?? []).filter((folder) => !selected.has(folder.notebookId)), ...synchronized.folders];
    statuses.set(repositoryId, gitSyncStatusTransition(statuses.get(repositoryId) ?? idle(repositoryId), { type: "sync.succeeded", at: new Date().toISOString() }));
    await persist(); notifications.delete(repositoryId);
  } catch (error) {
    const message = messageOf(error);
    statuses.set(repositoryId, gitSyncStatusTransition(statuses.get(repositoryId) ?? idle(repositoryId), { type: "sync.failed", message, conflicts: error instanceof GitConflictError ? [...error.conflicts] : undefined }));
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
  if (scheduler.phase !== "running") return;
  scheduler = gitSchedulerTransition(scheduler, "tick.started");
  try {
    await queue.run(async () => {
      await load(); if (scheduler.phase === "stopped" || scheduler.phase === "stopping") return;
      if (!gitProbeSettled()) await probeGitBinary();
      if (!moduleEnabled || !gitExecutable()) return;
      const due = [...configs.values()].find((config) => config.enabled && config.folders.length && (nextRun.get(config.id) ?? 0) <= Date.now());
      if (due) await sync(due.id);
    });
  } catch (error) { notifyFailure("scheduler", messageOf(error)); }
  finally { scheduler = gitSchedulerTransition(scheduler, "tick.finished"); }
}

export function startGitSync() {
  void probeGitBinary();
  scheduler = gitSchedulerTransition(scheduler, "scheduler.started");
  if (timer) return;
  timer = setInterval(() => { void tick(); }, 5000); timer.unref();
  void queue.run(load).catch((error) => notifyFailure("scheduler", messageOf(error)));
}
export function stopGitSync() {
  scheduler = gitSchedulerTransition(scheduler, "scheduler.stopped");
  clearInterval(timer); timer = undefined;
}

async function save(raw: GitRepositoryInput) {
  let input = validateGitRepository(raw);
  const previous = configs.get(input.id);
  if (previous) {
    const manifest = await readFile(path.join(app.getPath("userData"), "git-sync-repositories", input.id, "manifest.json"), "utf8").then((value) => JSON.parse(value)).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw new Error(t("recoveryUnreadable")); });
    if (manifest?.pending && !sameGitFolderTargets(input.folders, previous.folders)) throw new Error(t("recoveryPending"));
  }
  if (previous && (normalizedGitRemote(input) !== normalizedGitRemote(previous) || input.branch !== previous.branch || input.layout !== previous.layout)) throw new Error(t("immutableRepository"));
  if (!previous && input.layout === "legacy-root") throw new Error(t("subfolderRequired"));
  if ([...configs.values()].some((other) => other.id !== input.id && normalizedGitRemote(other) === normalizedGitRemote(input) && other.branch === input.branch)) throw new Error(t("duplicateBranch"));
  const history = mappingHistory[input.id] ?? [];
  input = await prepareGitFolderMappings(input, previous, history, path.join(app.getPath("userData"), "git-sync-repositories"));
  input = { ...input, remoteUrl: previous?.remoteUrl ?? input.remoteUrl };
  const added = input.folders.some((folder) => !previous?.folders.some((old) => old.notebookId === folder.notebookId));
  const config: GitRepositoryConfig = input;
  const previousHistory = mappingHistory[input.id];
  const previousStatus = statuses.get(input.id);
  configs.set(input.id, config);
  mappingHistory[input.id] = [...history.filter((old) => !input.folders.some((folder) => folder.notebookId === old.notebookId || folder.remotePath === old.remotePath)), ...input.folders];
  statuses.set(input.id, previousStatus ?? idle(input.id));
  try { await persist(); }
  catch (error) {
    if (previous) configs.set(input.id, previous); else configs.delete(input.id);
    if (previousHistory) mappingHistory[input.id] = previousHistory; else delete mappingHistory[input.id];
    if (previousStatus) statuses.set(input.id, previousStatus); else statuses.delete(input.id);
    throw error;
  }
  nextRun.set(input.id, Date.now() + input.intervalMinutes * 60_000); publish();
  return added && moduleEnabled ? sync(input.id) : state();
}

export function registerGitSyncIpc() {
  ipcMain.handle("git-sync:available", async (event) => {
    assertWorkspace(event);
    return Boolean(await probeGitBinary(true));
  });
  ipcMain.handle("git-sync:check-folder", async (event, localPath: unknown) => {
    assertWorkspace(event);
    return checkGitFolder(localPath);
  });
  ipcMain.handle("git-sync:remember-root", async (event, localPath: unknown) => {
    assertWorkspace(event);
    return rememberNotebookRoot(localPath);
  });
  ipcMain.on("git-sync:prepare-reply", (event, requestId: string, error: string | null) => {
    if (typeof requestId !== "string") return;
    const pending = pendingReplies.get(requestId);
    if (!pending || event.sender.id !== pending.senderId || event.senderFrame !== event.sender.mainFrame) return;
    pending.finish(error === null ? null : gitSyncPreparationFailure(error));
  });
  const handle = (channel: string, operation: (value: never) => Promise<unknown>) => {
    ipcMain.handle(channel, async (event, value) => {
      assertWorkspace(event);
      // eslint-disable-next-line preserve-caught-error
      return queue.run(async () => { try { await load(); return await operation(value as never); } catch (error) { throw new Error(messageOf(error)); } });
    });
  };
  handle("git-sync:state", async () => state());
  handle("git-sync:set-module", async (value) => {
    const enabled = value as unknown;
    if (typeof enabled !== "boolean") throw new Error(t("failed"));
    const previous = moduleEnabled;
    moduleEnabled = enabled;
    try { await persist(); }
    catch (error) { moduleEnabled = previous; throw error; }
    publish();
    return state();
  });
  handle("git-sync:save", save);
  handle("git-sync:now", async (value) => sync(validateRepositoryId(value)));
  handle("git-sync:rebind", async (request) => sync(await rebindGitFolder(request, { configs, mappingHistory, storageRoot: path.join(app.getPath("userData"), "git-sync-repositories"), persist, publish })));
  handle("git-sync:rename-folder", async (request) => renameGitTrackedNotebookFolder(request, retargetContext()));
  handle("git-sync:adopt-folder", async (request) => adoptRenamedNotebookFolder(request, retargetContext()));
  handle("git-sync:conflict", async (request: { repositoryId: string; conflictId: string }) => {
    const id = validateRepositoryId(request?.repositoryId);
    if (!configs.has(id) || typeof request.conflictId !== "string" || !/^[a-f0-9]{64}$/.test(request.conflictId)) throw new Error(t("invalidConflict"));
    return getGitConflict(id, request.conflictId);
  });
  handle("git-sync:resolve-conflict", async (request: GitConflictResolution) => {
    const id = validateRepositoryId(request?.repositoryId);
    if (!configs.has(id)) throw new Error(t("configRemoved"));
    await resolveGitConflict(request);
    return sync(id);
  });
  handle("git-sync:remove", async (value) => {
    const id = validateRepositoryId(value), previous = configs.get(id), previousStatus = statuses.get(id);
    configs.delete(id); statuses.delete(id);
    try { await persist(); }
    catch (error) { if (previous) configs.set(id, previous); if (previousStatus) statuses.set(id, previousStatus); throw error; }
    nextRun.delete(id); notifications.delete(id); retainGitConflicts(id, new Set()); publish(); return state();
  });
}
