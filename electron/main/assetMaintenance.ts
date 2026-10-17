import { t } from "./i18n/attachments";
import { assertGitSyncWritable } from "./gitSyncLock";
import { BrowserWindow, dialog, ipcMain, net, shell } from "electron";
import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AssetNotebook, AssetScan, AssetWorkspaceSnapshot } from "../../src/lib/asset-maintenance-contract";
import { scanUnreferencedLocalAssets } from "../../src/lib/local-folder-asset-maintenance";
import { assertAllowed } from "./allowlist";
import { assetFingerprint, assertNotebookPath, isInsideNotebook, notebookScanFs } from "./assetMaintenanceFiles";
import { createAssetMaintenanceWindow, getAssetMaintenanceWindow, lookupWindowContext } from "./windows";

import { assetMaintenanceTransition, activeAssetScan, assetMaintenanceBusy, type AssetMaintenanceLifecycle } from "./assetMaintenanceState";

let lifecycle: AssetMaintenanceLifecycle = { status: "idle" };
let nextOperationId = 0;
const requests = new Map<string, { senderId: number; resolve: (snapshot: AssetWorkspaceSnapshot) => void; reject: (error: Error) => void }>();

function workspaces() {
  return BrowserWindow.getAllWindows().filter((win) => lookupWindowContext(win)?.kind === "workspace");
}

async function workspaceSnapshots(): Promise<AssetWorkspaceSnapshot[]> {
  const windows = workspaces();
  if (!windows.length) throw new Error(t("workspaceRequired"));
  return Promise.all(windows.map((win) => new Promise<AssetWorkspaceSnapshot>((resolve, reject) => {
    const requestId = randomUUID();
    const timer = setTimeout(() => finish(new Error(t("workspaceTimeout"))), 15000);
    const finish = (error?: Error, snapshot?: AssetWorkspaceSnapshot) => {
      clearTimeout(timer);
      requests.delete(requestId);
      if (error) reject(error); else resolve(snapshot!);
    };
    requests.set(requestId, { senderId: win.webContents.id, resolve: (snapshot) => finish(undefined, snapshot), reject: (error) => finish(error) });
    win.webContents.send("asset-maintenance:snapshot-request", requestId);
  })));
}

function notebooksFrom(snapshots: AssetWorkspaceSnapshot[]): AssetNotebook[] {
  const byId = new Map<string, AssetNotebook>();
  for (const snapshot of snapshots) for (const notebook of snapshot.notebooks) {
    const previous = byId.get(notebook.id);
    if (previous && previous.localPath !== notebook.localPath) throw new Error(t("pathsMismatch"));
    byId.set(notebook.id, notebook);
  }
  return [...byId.values()];
}

function pagesForNotebook(snapshots: AssetWorkspaceSnapshot[], notebook: AssetNotebook, root: string) {
  const configuredRoot = path.resolve(notebook.localPath);
  return snapshots.flatMap((snapshot) => snapshot.pages).flatMap((page) => {
    if (!page.localFilePath) return [];
    const filePath = path.resolve(page.localFilePath);
    if (isInsideNotebook(root, filePath)) return [{ ...page, localFilePath: filePath }];
    if (!isInsideNotebook(configuredRoot, filePath)) return [];
    return [{ ...page, localFilePath: path.join(root, path.relative(configuredRoot, filePath)) }];
  });
}

function assertMaintenanceSender(event: Electron.IpcMainInvokeEvent) {
  if (event.sender !== getAssetMaintenanceWindow()?.webContents || event.senderFrame !== event.sender.mainFrame) {
    throw new Error(t("windowRequired"));
  }
}

function assertIdle() {
  if (assetMaintenanceBusy(lifecycle)) throw new Error(t("busy"));
}

export function registerAssetMaintenanceIpc(): void {
  ipcMain.on("asset-maintenance:snapshot-reply", (event, requestId: string, snapshot: AssetWorkspaceSnapshot | null) => {
    const request = requests.get(requestId);
    if (!request || request.senderId !== event.sender.id || event.senderFrame !== event.sender.mainFrame) return;
    if (!snapshot || !Array.isArray(snapshot.pages) || !Array.isArray(snapshot.notebooks)) request.reject(new Error(t("snapshotFailed")));
    else request.resolve(snapshot);
  });
  ipcMain.handle("asset-maintenance:open", (event) => {
    if (lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") throw new Error(t("openFromWorkspace"));
    const existing = getAssetMaintenanceWindow();
    const win = createAssetMaintenanceWindow();
    if (existing) return;
    lifecycle = assetMaintenanceTransition(lifecycle, { type: "close" });
    // 专用 session + 不透明扫描令牌：预览协议没有任意路径读取入口。
    const previewSession = win.webContents.session;
    previewSession.protocol.handle("goose-asset", async (request) => {
      const url = new URL(request.url);
      const record = activeAssetScan(lifecycle);
      const indexText = url.pathname.slice(1);
      const asset = /^\d+$/.test(indexText) ? record?.result.assets[Number(indexText)] : undefined;
      if (!record || url.hostname !== record.result.token || !asset || Date.now() - record.created > 10 * 60_000) return new Response(null, { status: 404 });
      try {
        await assertNotebookPath(record.root, asset.path);
        return await net.fetch(pathToFileURL(asset.path).href, { headers: request.headers });
      } catch { return new Response(null, { status: 404 }); }
    });
    win.once("closed", () => {
      lifecycle = assetMaintenanceTransition(lifecycle, { type: "close" });
      previewSession.protocol.unhandle("goose-asset");
    });
  });
  ipcMain.handle("asset-maintenance:appearance", async (event) => {
    assertMaintenanceSender(event);
    return (await workspaceSnapshots())[0].appearance;
  });
  ipcMain.handle("asset-maintenance:notebooks", async (event) => {
    assertMaintenanceSender(event);
    return notebooksFrom(await workspaceSnapshots());
  });
  ipcMain.handle("asset-maintenance:scan", async (event, notebookId: string) => {
    assertMaintenanceSender(event);
    assertIdle();
    const operationId = ++nextOperationId;
    lifecycle = assetMaintenanceTransition(lifecycle, { type: "scan", operationId });
    try {
      const snapshots = await workspaceSnapshots();
      const notebook = notebooksFrom(snapshots).find((item) => item.id === notebookId);
      if (!notebook) throw new Error(t("selectNotebook"));
      const root = await realpath(assertAllowed(notebook.localPath));
      assertAllowed(root);
      const assets = await scanUnreferencedLocalAssets({ basePath: root, pages: pagesForNotebook(snapshots, notebook, root), gooseFs: notebookScanFs(root) });
      const fingerprints = new Map<string, string>();
      for (const asset of assets) fingerprints.set(asset.path, await assetFingerprint(root, asset.path));
      const token = randomUUID();
      const result: AssetScan = { token, notebook, assets: assets.map((asset, index) => ({ ...asset, previewUrl: `goose-asset://${token}/${index}` })) };
      if (event.sender.isDestroyed()) throw new Error(t("windowClosed"));
      lifecycle = assetMaintenanceTransition(lifecycle, { type: "scanned", operationId, record: { result, root, fingerprints, created: Date.now() } });
      return result;
    } finally { lifecycle = assetMaintenanceTransition(lifecycle, { type: "finish", operationId }); }
  });
  ipcMain.handle("asset-maintenance:trash", async (event, token: string, paths: string[]) => {
    assertMaintenanceSender(event);
    assertIdle();
    const record = activeAssetScan(lifecycle);
    if (!record || record.result.token !== token || Date.now() - record.created > 10 * 60_000) throw new Error(t("expired"));
    if (!Array.isArray(paths) || !paths.length || paths.some((p) => !record.fingerprints.has(p))) throw new Error(t("onlyScannedFiles"));
    const operationId = ++nextOperationId;
    lifecycle = assetMaintenanceTransition(lifecycle, { type: "confirm", operationId });
    try {
      const selected = [...new Set(paths)];
      const confirmation = await dialog.showMessageBox(getAssetMaintenanceWindow()!, {
        type: "warning", title: t(process.platform === "win32" ? "moveRecycle" : "moveTrash"), message: t(process.platform === "win32" ? "confirmRecycle" : "confirmTrash", { count: selected.length }),
        detail: t("confirmDetail"), buttons: [t("cancel"), t(process.platform === "win32" ? "moveRecycle" : "moveTrash")], defaultId: 0, cancelId: 0, noLink: true,
      });
      if (confirmation.response !== 1) {
        lifecycle = assetMaintenanceTransition(lifecycle, { type: "cancel", operationId });
        return { deleted: 0, canceled: true };
      }
      // 一次性令牌；任何失败、部分完成或再次点击均须重新扫描。
      lifecycle = assetMaintenanceTransition(lifecycle, { type: "consume", operationId });
      if (event.sender.isDestroyed()) throw new Error(t("windowClosed"));
      if (Date.now() - record.created > 10 * 60_000) throw new Error(t("expired"));
      const snapshots = await workspaceSnapshots();
      const notebook = notebooksFrom(snapshots).find((item) => item.id === record.result.notebook.id);
      if (!notebook || await realpath(assertAllowed(notebook.localPath)) !== record.root) throw new Error(t("notebookChanged"));
      const latest = await scanUnreferencedLocalAssets({ basePath: record.root, pages: pagesForNotebook(snapshots, notebook, record.root), gooseFs: notebookScanFs(record.root) });
      const unreferenced = new Set(latest.map((asset) => asset.path));
      for (const filePath of selected) {
        if (!unreferenced.has(filePath) || await assetFingerprint(record.root, filePath) !== record.fingerprints.get(filePath)) throw new Error(t("changed"));
      }
      let deleted = 0;
      try {
        for (const filePath of selected) {
          if (event.sender.isDestroyed()) throw new Error(t("windowClosed"));
          await assertNotebookPath(record.root, filePath);
          if (await assetFingerprint(record.root, filePath) !== record.fingerprints.get(filePath)) throw new Error(t("fileChanged"));
          assertGitSyncWritable(filePath);
          await shell.trashItem(filePath);
          deleted++;
        }
      } catch (error) { throw new Error(t(process.platform === "win32" ? "partialRecycle" : "partialTrash", { count: deleted, reason: String(error) }), { cause: error }); }
      return { deleted, canceled: false };
    } finally { lifecycle = assetMaintenanceTransition(lifecycle, { type: "finish", operationId }); }
  });
}
