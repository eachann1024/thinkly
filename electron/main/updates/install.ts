import { t } from "../i18n/updates";
import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { access, lstat, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { constants, openSync, closeSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { markQuitting } from "../windows";
import { flushBeforeUpdate } from "./save";
import type { VerifiedUpdate } from "./release";
import { canClearInstallStage, compareSemver } from "../../../src/lib/appUpdateRelease";
import { isUpdateStageName, livesInUpdateStage, removeSiblingUpdateStages } from "./installStages";
import { describeFsError, discardDirectory, isMissingFile, replaceUpdateDirectory } from "./staging";

const exec = promisify(execFile);
const installedApp = () => path.resolve(process.execPath, "../../..");
const unpackedApp = (update: VerifiedUpdate) => path.join(path.dirname(update.path), "unpacked", "Thinkly.app");
const stageRecord = () => path.join(app.getPath("userData"), "app-updates", "install-stage.json");

async function validateBundle(bundle: string, version: string): Promise<void> {
  if (!(await lstat(bundle)).isDirectory() || await realpath(bundle) !== bundle) throw new Error(t("invalidBundle"));
  const plist = path.join(bundle, "Contents", "Info.plist");
  const value = async (key: string) => (await exec("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", plist])).stdout.trim();
  if (await value("CFBundleIdentifier") !== "com.thinkly.desktop" || await value("CFBundleShortVersionString") !== version) {
    throw new Error(t("identityMismatch"));
  }
  const executable = path.join(bundle, "Contents", "MacOS", "Thinkly");
  const arch = (await exec("/usr/bin/lipo", ["-archs", executable])).stdout.trim().split(/\s+/);
  if (!arch.includes(process.arch === "arm64" ? "arm64" : "x86_64")) throw new Error(t("architectureMismatch"));
}

export async function prepareMacUpdate(update: VerifiedUpdate): Promise<void> {
  const directory = path.dirname(unpackedApp(update));
  await replaceUpdateDirectory(directory, async () => {
    await exec("/usr/bin/ditto", ["-x", "-k", update.path, directory]);
    await validateBundle(unpackedApp(update), update.version);
  });
}

const installer = `#!/bin/sh
set -eu
target="$1"
stage="$2"
parent_pid="$3"
process_pattern="$4"
count=0
while kill -0 "$parent_pid" 2>/dev/null; do
  count=$((count + 1))
  if [ "$count" -gt 120 ]; then exit 1; fi
  sleep 1
done
remove_stage() {
  rm -rf "$stage"
}
rollback() {
  if [ -d "$stage/previous.app" ]; then
    if [ -e "$target" ]; then mv "$target" "$stage/failed.app"; fi
    mv "$stage/previous.app" "$target"
  fi
  /usr/bin/open "$target" || true
  remove_stage
}
trap rollback HUP INT TERM
if ! mv "$target" "$stage/previous.app"; then /usr/bin/open "$target"; remove_stage; exit 1; fi
if ! mv "$stage/next.app" "$target"; then rollback; exit 1; fi
if ! /usr/bin/open "$target"; then rollback; exit 1; fi
count=0
while [ ! -f "$stage/started" ]; do
  count=$((count + 1))
  if [ "$count" -gt 60 ]; then
    if ! /usr/bin/pgrep -f "$process_pattern" >/dev/null; then rollback; exit 1; fi
    remove_stage
    exit 0
  fi
  sleep 1
done
remove_stage
`;

async function installMac(update: VerifiedUpdate): Promise<void> {
  const target = installedApp();
  if (!target.endsWith(".app") || target.includes("/AppTranslocation/") || target.startsWith("/Volumes/")) {
    throw new Error(t("moveToApplications"));
  }
  await access(path.dirname(target), constants.W_OK);
  await removeSiblingUpdateStages(target);
  await prepareMacUpdate(update);
  const stage = await mkdtemp(path.join(path.dirname(target), ".goose-update-"));
  try {
    await exec("/usr/bin/ditto", [unpackedApp(update), path.join(stage, "next.app")]);
    await validateBundle(path.join(stage, "next.app"), update.version);
    await writeFile(stageRecord(), JSON.stringify({ path: stage, version: update.version }), { mode: 0o600 });
    const script = path.join(stage, "install.sh");
    await writeFile(script, installer, { mode: 0o700 });
    await flushBeforeUpdate();
    const log = openSync(path.join(app.getPath("userData"), "app-updates", "install.log"), "a", 0o600);
    try {
      const escapedExecutable = process.execPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const child = spawn("/bin/sh", [script, target, stage, String(process.pid), `^${escapedExecutable}($| )`], {
        detached: true, stdio: ["ignore", log, log],
      });
      await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
      child.unref();
    } finally { closeSync(log); }
  } catch (error) {
    await discardDirectory(stage, { strict: false }).catch((cleanupError: unknown) => {
      console.error(`[update] could not remove the install stage: ${describeFsError(cleanupError)}`);
    });
    throw error;
  }
  markQuitting();
  app.quit();
}

export async function installUpdate(update: VerifiedUpdate): Promise<void> {
  if (process.platform === "darwin") return installMac(update);
  if (process.platform !== "win32" || !update.path.endsWith(".exe")) throw new Error(t("finishInstaller"));
  await flushBeforeUpdate();
  const child = spawn(update.path, ["--updated", "--force-run"], { detached: true, stdio: "ignore" });
  await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  child.unref();
  markQuitting();
  app.quit();
}

type StageRecord = { path: string; version: string };

async function readStageRecord(): Promise<StageRecord | null | undefined> {
  try {
    const record = JSON.parse(await readFile(stageRecord(), "utf8")) as { path?: string; version?: string };
    if (!record.path || !record.version || !isUpdateStageName(path.basename(record.path))) return null;
    return { path: record.path, version: record.version };
  } catch (error) {
    if (isMissingFile(error)) return null;
    console.error(`[update] could not read the install stage: ${describeFsError(error)}`);
    return undefined;
  }
}

async function signalInstallStage(bundle: string, runningVersion: string, record: StageRecord | null): Promise<void> {
  if (!record || !canClearInstallStage(runningVersion, record.version)) return;
  try {
    if (await realpath(path.dirname(record.path)) !== await realpath(path.dirname(bundle))) return;
    await writeFile(path.join(record.path, "started"), String(process.pid), { mode: 0o600 });
  } catch (error) {
    if (!isMissingFile(error)) console.error(`[update] could not mark the install started: ${describeFsError(error)}`);
  }
}

async function finishMacInstallStage(runningVersion: string): Promise<void> {
  const bundle = installedApp();
  if (!bundle.endsWith(".app") || livesInUpdateStage(bundle)) return;
  const record = await readStageRecord();
  if (record === undefined || !canClearInstallStage(runningVersion, record?.version)) return;
  await signalInstallStage(bundle, runningVersion, record);
  await removeSiblingUpdateStages(bundle);
  await rm(stageRecord(), { force: true });
}

export async function acknowledgeMacInstall(): Promise<void> {
  if (process.platform !== "darwin" || !app.isPackaged) return;
  try {
    await finishMacInstallStage(app.getVersion());
  } catch (error) {
    if (!isMissingFile(error)) console.error(`[update] could not remove install leftovers: ${describeFsError(error)}`);
  }
}

export async function cleanInstalledUpdate(update: VerifiedUpdate): Promise<void> {
  if (process.platform !== "darwin" || compareSemver(app.getVersion(), update.version) < 0) return;
  await finishMacInstallStage(app.getVersion()).catch((error: unknown) => {
    if (!isMissingFile(error)) console.error(`[update] could not finish the install stage: ${describeFsError(error)}`);
  });
}
