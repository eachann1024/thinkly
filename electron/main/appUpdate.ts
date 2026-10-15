import { app, BrowserWindow, shell } from "electron";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { compareSemver, pickUpdateAsset, PUBLIC_RELEASES_LATEST_URL, type GithubReleaseAsset } from "../../src/lib/appUpdateRelease";
import type { AppUpdateCheckResult, AppUpdateState } from "../../src/lib/appUpdateTypes";
import { getUpdateState, setUpdateState } from "./updates/state";
import { fetchRelease, type ReleaseDetails, type VerifiedUpdate } from "./updates/release";
import { downloadVerifiedUpdate, verifyUpdateFile } from "./updates/download";
import { installUpdate, prepareMacUpdate, cleanInstalledUpdate } from "./updates/install";

export { getUpdateState } from "./updates/state";
export type UpdateCheckResult = AppUpdateCheckResult;
let pending: VerifiedUpdate | null = null;
let checkTask: Promise<AppUpdateCheckResult> | null = null;
let downloadTask: Promise<{ path: string }> | null = null;
let installing = false;
let started = false;
const recordPath = () => path.join(app.getPath("userData"), "app-updates", "ready.json");
const releaseDetails = (release: ReleaseDetails): ReleaseDetails => ({
  releaseNotes: release.releaseNotes, publishedAt: release.publishedAt, releaseUrl: release.releaseUrl,
});
const updateTarget = (version: string, asset: GithubReleaseAsset, details: ReleaseDetails) => ({
  ...releaseDetails(details), version, assetName: asset.name, downloadUrl: asset.browser_download_url,
});

export const getAppVersion = () => app.getVersion();
export const getReadyUpdate = () => getUpdateState().status === "ready" ? getUpdateState().version || "" : "";

async function check(): Promise<AppUpdateCheckResult> {
  const currentVersion = getAppVersion();
  const releaseUrl = PUBLIC_RELEASES_LATEST_URL;
  const known = getUpdateState();
  const hasKnownUpdate = Boolean(known.version && compareSemver(known.version, currentVersion) > 0);
  const canShowCheck = () => !downloadTask && !pending && !installing;
  if (canShowCheck() && !hasKnownUpdate) setUpdateState({ status: "checking" });
  try {
    const release = await fetchRelease();
    const details = releaseDetails(release);
    if (compareSemver(currentVersion, release.version) >= 0) {
      if (canShowCheck()) setUpdateState({ ...(currentVersion === release.version ? details : {}), status: "up-to-date", version: currentVersion });
      return { ...details, status: "up-to-date", currentVersion, latestVersion: release.version, releaseUrl: release.releaseUrl || releaseUrl };
    }
    const asset = pickUpdateAsset(release.assets, process.platform, process.arch);
    if (!asset) throw new Error("已有新版本，但没有适合当前系统的安装包");
    const result = { ...details, status: "available" as const, currentVersion, latestVersion: release.version,
      assetName: asset.name, downloadUrl: asset.browser_download_url, releaseUrl: release.releaseUrl || releaseUrl };
    if (canShowCheck()) setUpdateState({ ...result, status: "available", version: release.version });
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "检查更新失败";
    if (canShowCheck()) setUpdateState({ ...(hasKnownUpdate ? known : {}), status: "error", message: reason });
    return { status: "unavailable", currentVersion, reason, releaseUrl };
  }
}

export function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  if (!checkTask) checkTask = check().finally(() => { checkTask = null; });
  return checkTask;
}

async function download(downloadUrl: string, filename: string): Promise<{ path: string }> {
  const known = getUpdateState();
  let target: Partial<AppUpdateState> = { ...releaseDetails(known), version: known.version,
    assetName: known.assetName, downloadUrl: known.downloadUrl };
  try {
    const release = await fetchRelease();
    const asset = pickUpdateAsset(release.assets, process.platform, process.arch);
    if (compareSemver(release.version, getAppVersion()) <= 0) {
      target = { version: getAppVersion() };
      throw new Error("当前已是最新版本");
    }
    if (!asset) throw new Error("已有新版本，但没有适合当前系统的安装包");
    const details = releaseDetails(release);
    target = updateTarget(release.version, asset, details);
    if (asset.name !== filename || asset.browser_download_url !== downloadUrl) {
      throw new Error("版本已变化，请重试更新");
    }
    setUpdateState({ ...target, status: "downloading", percent: 0 });
    const update = await downloadVerifiedUpdate(release.version, asset, details);
    if (process.platform === "darwin" && filename.endsWith(".zip")) {
      await prepareMacUpdate(update);
    } else if (process.platform !== "win32") {
      shell.showItemInFolder(update.path);
      setUpdateState({ ...target, status: "available", downloadPath: update.path,
        message: "安装包已下载，请打开安装" });
      return { path: update.path };
    }
    await writeFile(recordPath(), JSON.stringify(update), { mode: 0o600 });
    pending = update;
    notifyReady(update);
    return { path: update.path };
  } catch (error) {
    setUpdateState({ ...target, status: "error", message: error instanceof Error ? error.message : "下载更新失败" });
    throw error;
  }
}

export function downloadAppUpdate(downloadUrl: string, filename: string): Promise<{ path: string }> {
  if (pending) return Promise.resolve({ path: pending.path });
  if (!downloadTask) downloadTask = download(downloadUrl, filename).finally(() => { downloadTask = null; });
  return downloadTask;
}

function notifyReady(update: VerifiedUpdate): void {
  setUpdateState({ ...updateTarget(update.version, update.asset, update), status: "ready", downloadPath: update.path });
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send("desktop:update-ready", update.version);
}

export async function installReadyUpdate(): Promise<void> {
  if (installing) return;
  if (!pending || !app.isPackaged) throw new Error("没有可安装的更新");
  const update = pending;
  installing = true;
  try {
    try { await verifyUpdateFile(update); }
    catch (error) {
      pending = null;
      await rm(recordPath(), { force: true });
      throw error;
    }
    await installUpdate(update);
  } catch (error) {
    setUpdateState({ ...updateTarget(update.version, update.asset, update), status: pending ? "ready" : "error", downloadPath: pending?.path,
      message: error instanceof Error ? error.message : "安装更新失败" });
    throw error;
  } finally { installing = false; }
}

async function restoreReady(): Promise<void> {
  await mkdir(path.dirname(recordPath()), { recursive: true });
  try {
    const update = JSON.parse(await readFile(recordPath(), "utf8")) as VerifiedUpdate;
    if (!/^\d+\.\d+\.\d+$/.test(update.version)) return;
    const expectedDir = path.join(path.dirname(recordPath()), update.version);
    if (path.dirname(update.path) !== expectedDir || path.basename(update.path) !== update.asset.name) return;
    if (compareSemver(update.version, getAppVersion()) <= 0) {
      await cleanInstalledUpdate(update);
      await rm(expectedDir, { recursive: true, force: true });
      await rm(recordPath(), { force: true });
      return;
    }
    await verifyUpdateFile(update);
    pending = update;
    notifyReady(update);
  } catch { /* An incomplete or deleted download is fetched again on the next check. */ }
}

export function startAutomaticUpdates(): void {
  if (started || !app.isPackaged) return;
  started = true;
  const run = async () => {
    if (pending || downloadTask || installing) return;
    const result = await checkForAppUpdate();
    if (result.status === "available" && ((process.platform === "darwin" && result.assetName.endsWith("-mac.zip")) || process.platform === "win32")) {
      await downloadAppUpdate(result.downloadUrl, result.assetName).catch((error) => console.error("[update]", error));
    }
  };
  void restoreReady().then(() => {
    setTimeout(() => void run(), 15_000).unref();
    setInterval(() => void run(), 4 * 60 * 60 * 1000).unref();
  }).catch((error) => console.error("[update]", error));
}

export function revealDownloadedUpdate(filePath: string): void { shell.showItemInFolder(filePath); }
