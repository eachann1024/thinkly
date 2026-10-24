import { t } from "./i18n/updates";
import { app, BrowserWindow, shell } from "electron";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { compareSemver, pickUpdateAsset, PUBLIC_RELEASES_LATEST_URL, readyVersionIsNewer, type GithubReleaseAsset } from "../../src/lib/appUpdateRelease";
import type { AppUpdateCheckResult, AppUpdateRetryMetadata } from "../../src/lib/appUpdateTypes";
import { getUpdateState, sendUpdateEvent } from "./updates/state";
import { updateRetryMetadata } from "../../src/lib/appUpdateState";
import { updateLifecycleTransition, automaticUpdatesTransition, type UpdateLifecycle, type UpdateLifecycleEvent, type AutomaticUpdates } from "./updates/lifecycle";
import { fetchRelease, type ReleaseDetails, type VerifiedUpdate } from "./updates/release";
import { downloadVerifiedUpdate, verifyUpdateFile } from "./updates/download";
import { installUpdate, prepareMacUpdate, acknowledgeMacInstall, cleanInstalledUpdate } from "./updates/install";
import { cleanVersionDirectories, describeFsError, discardDirectory, isFilesystemError, isMissingFile } from "./updates/staging";

export { getUpdateState } from "./updates/state";
export type UpdateCheckResult = AppUpdateCheckResult;
let lifecycle: UpdateLifecycle = { phase: "empty" };
let automatic: AutomaticUpdates = { phase: "stopped" };
let nextDownloadId = 0;
let restoreTask: Promise<void> | null = null;
const sendLifecycle = (event: UpdateLifecycleEvent) => { lifecycle = updateLifecycleTransition(lifecycle, event); };
let checkTask: Promise<AppUpdateCheckResult> | null = null;
let downloadTask: Promise<{ path: string }> | null = null;
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
  const canShowCheck = () => lifecycle.phase === "empty" && !downloadTask;
  if (canShowCheck() && !hasKnownUpdate) sendUpdateEvent({ type: "check.started" });
  try {
    const release = await fetchRelease();
    const details = releaseDetails(release);
    if (compareSemver(currentVersion, release.version) >= 0) {
      if (canShowCheck()) sendUpdateEvent({ type: "check.current", details: currentVersion === release.version ? details : {}, version: currentVersion });
      return { ...details, status: "up-to-date", currentVersion, latestVersion: release.version, releaseUrl: release.releaseUrl || releaseUrl };
    }
    const asset = pickUpdateAsset(release.assets, process.platform, process.arch);
    if (!asset) throw new Error(t("noPackage"));
    const result = { ...details, status: "available" as const, currentVersion, latestVersion: release.version,
      assetName: asset.name, downloadUrl: asset.browser_download_url, releaseUrl: release.releaseUrl || releaseUrl };
    if (canShowCheck()) sendUpdateEvent({ type: "check.available", target: updateTarget(release.version, asset, details) });
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : t("checkFailed");
    if (canShowCheck()) sendUpdateEvent({ type: "check.failed", metadata: hasKnownUpdate ? updateRetryMetadata(known) : {}, message: reason });
    return { status: "unavailable", currentVersion, reason, releaseUrl };
  }
}

export function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  if (!checkTask) checkTask = check().finally(() => { checkTask = null; });
  return checkTask;
}

async function download(downloadUrl: string, filename: string): Promise<{ path: string }> {
  const known = getUpdateState();
  let target: AppUpdateRetryMetadata = { ...releaseDetails(known), version: known.version,
    assetName: known.assetName, downloadUrl: known.downloadUrl };
  try {
    const release = await fetchRelease();
    const asset = pickUpdateAsset(release.assets, process.platform, process.arch);
    if (compareSemver(release.version, getAppVersion()) <= 0) {
      target = { version: getAppVersion() };
      throw new Error(t("upToDate"));
    }
    if (!asset) throw new Error(t("noPackage"));
    const details = releaseDetails(release);
    target = updateTarget(release.version, asset, details);
    if (asset.name !== filename || asset.browser_download_url !== downloadUrl) {
      throw new Error(t("versionChanged"));
    }
    sendUpdateEvent({ type: "download.started", target: updateTarget(release.version, asset, details) });
    const update = await downloadVerifiedUpdate(release.version, asset, details);
    if (process.platform === "darwin" && filename.endsWith(".zip")) {
      await prepareMacUpdate(update);
    } else if (process.platform !== "win32") {
      shell.showItemInFolder(update.path);
      sendUpdateEvent({ type: "download.completed", target: updateTarget(release.version, asset, details), path: update.path,
        message: t("openInstaller") });
      return { path: update.path };
    }
    await writeFile(recordPath(), JSON.stringify(update), { mode: 0o600 });
    sendLifecycle({ type: "update.ready", update });
    notifyReady(update);
    return { path: update.path };
  } catch (error) {
    sendUpdateEvent({ type: "download.failed", metadata: target, message: error instanceof Error ? error.message : t("downloadFailed") });
    throw error;
  }
}

export function downloadAppUpdate(downloadUrl: string, filename: string): Promise<{ path: string }> {
  if (lifecycle.phase === "restoring" && restoreTask) return restoreTask.then(() => downloadAppUpdate(downloadUrl, filename));
  if (lifecycle.phase === "ready" || lifecycle.phase === "installing") return Promise.resolve({ path: lifecycle.update.path });
  if (lifecycle.phase === "invalidating") return Promise.reject(new Error(t("verifying")));
  if (!downloadTask) {
    const id = ++nextDownloadId;
    sendLifecycle({ type: "download.started", id });
    downloadTask = download(downloadUrl, filename).finally(() => {
      sendLifecycle({ type: "download.finished", id });
      downloadTask = null;
    });
  }
  return downloadTask;
}

function notifyReady(update: VerifiedUpdate): void {
  sendUpdateEvent({ type: "update.ready", target: updateTarget(update.version, update.asset, update), path: update.path });
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send("desktop:update-ready", update.version);
}

async function clearReadyRecord(): Promise<void> {
  await rm(recordPath(), { force: true }).catch((error: unknown) => {
    console.error(`[update] could not clear the ready update: ${describeFsError(error)}`);
  });
}

function unpackedStaging(update: VerifiedUpdate): string | null {
  const versionDir = path.dirname(update.path);
  if (path.basename(versionDir) !== update.version || path.basename(path.dirname(versionDir)) !== "app-updates") return null;
  return path.join(versionDir, "unpacked");
}

async function forgetReadyUpdate(update: VerifiedUpdate): Promise<void> {
  await clearReadyRecord();
  const unpacked = unpackedStaging(update);
  if (unpacked) await discardDirectory(unpacked, { strict: false });
}

export async function installReadyUpdate(): Promise<void> {
  const current = lifecycle;
  if (current.phase === "installing" || current.phase === "invalidating") return;
  if (current.phase !== "ready" || !app.isPackaged) throw new Error(t("noReadyUpdate"));
  const update = current.update;
  sendLifecycle({ type: "install.started" });
  let recover = false;
  let failure = "";
  try {
    try { await verifyUpdateFile(update); }
    catch (error) {
      sendLifecycle({ type: "install.invalidated" });
      await clearReadyRecord();
      throw error;
    }
    await installUpdate(update);
  } catch (error) {
    failure = error instanceof Error ? describeFsError(error) : t("installFailed");
    const filesystem = lifecycle.phase === "installing" && isFilesystemError(error);
    if (filesystem) {
      sendLifecycle({ type: "install.invalidated" });
      await forgetReadyUpdate(update);
      recover = true;
    }
    sendUpdateEvent({ type: "install.failed", target: updateTarget(update.version, update.asset, update),
      path: filesystem || lifecycle.phase !== "installing" ? undefined : update.path,
      message: failure });
    throw error instanceof Error ? error : new Error(failure);
  } finally {
    sendLifecycle({ type: "install.finished" });
    if (recover && lifecycle.phase === "empty" && update.asset.browser_download_url && update.asset.name) {
      console.error(`[update] install failed, downloading again: ${failure}`);
      void downloadAppUpdate(update.asset.browser_download_url, update.asset.name)
        .catch((downloadError: unknown) => console.error("[update]", downloadError));
    }
  }
}

function parseReadyUpdate(raw: string, root: string): VerifiedUpdate | null {
  const update = JSON.parse(raw) as VerifiedUpdate;
  if (!update || typeof update.version !== "string" || !/^\d+\.\d+\.\d+$/.test(update.version)) return null;
  if (!update.asset || typeof update.asset.name !== "string" || typeof update.path !== "string") return null;
  const expectedDir = path.join(root, update.version);
  if (path.dirname(update.path) !== expectedDir || path.basename(update.path) !== update.asset.name) return null;
  return update;
}

async function restoreReady(): Promise<void> {
  const root = path.dirname(recordPath());
  await mkdir(root, { recursive: true });
  let pending: VerifiedUpdate | null = null;
  let sawRecord = false;
  try {
    const raw = await readFile(recordPath(), "utf8");
    sawRecord = true;
    pending = parseReadyUpdate(raw, root);
  } catch (error) {
    if (!isMissingFile(error)) console.error(`[update] could not read the downloaded update: ${describeFsError(error)}`);
  }
  if (sawRecord && !pending) await clearReadyRecord();
  await acknowledgeMacInstall();
  const keep = pending && readyVersionIsNewer(pending.version, getAppVersion()) ? pending.version : null;
  await cleanVersionDirectories(root, keep);
  if (!pending) return;
  if (!keep) {
    await cleanInstalledUpdate(pending);
    await clearReadyRecord();
    return;
  }
  try {
    await verifyUpdateFile(pending);
  } catch (error) {
    console.error(`[update] downloaded update failed verification: ${describeFsError(error)}`);
    return;
  }
  sendLifecycle({ type: "update.ready", update: pending });
  notifyReady(pending);
}

export function startAutomaticUpdates(): void {
  if (automatic.phase !== "stopped" || !app.isPackaged) return;
  automatic = automaticUpdatesTransition(automatic, "started");
  const run = async () => {
    if (lifecycle.phase !== "empty" || downloadTask) return;
    const result = await checkForAppUpdate();
    if (result.status === "available" && ((process.platform === "darwin" && result.assetName.endsWith("-mac.zip")) || process.platform === "win32")) {
      await downloadAppUpdate(result.downloadUrl, result.assetName).catch((error) => console.error("[update]", error));
    }
  };
  const restore = async () => {
    if (lifecycle.phase !== "empty") return;
    sendLifecycle({ type: "restore.started" });
    await restoreReady();
  };
  const restoring = downloadTask ? downloadTask.then(() => undefined, () => undefined).then(restore) : restore();
  restoreTask = restoring.finally(() => { sendLifecycle({ type: "restore.finished" }); restoreTask = null; });
  void restoreTask.then(() => {
    automatic = automaticUpdatesTransition(automatic, "restored");
    setTimeout(() => void run(), 15_000).unref();
    setInterval(() => void run(), 4 * 60 * 60 * 1000).unref();
  }).catch((error) => { automatic = automaticUpdatesTransition(automatic, "failed"); console.error("[update]", error); });
}

export function revealDownloadedUpdate(filePath: string): void { shell.showItemInFolder(filePath); }
