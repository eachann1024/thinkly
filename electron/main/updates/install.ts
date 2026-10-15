import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { access, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { constants, openSync, closeSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { markQuitting } from "../windows";
import { flushBeforeUpdate } from "./save";
import type { VerifiedUpdate } from "./release";

const exec = promisify(execFile);
const installedApp = () => path.resolve(process.execPath, "../../..");
const unpackedApp = (update: VerifiedUpdate) => path.join(path.dirname(update.path), "unpacked", "Goose Note.app");
const stageRecord = () => path.join(app.getPath("userData"), "app-updates", "install-stage.json");

async function validateBundle(bundle: string, version: string): Promise<void> {
  if (!(await lstat(bundle)).isDirectory() || await realpath(bundle) !== bundle) throw new Error("更新应用目录无效");
  const plist = path.join(bundle, "Contents", "Info.plist");
  const value = async (key: string) => (await exec("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", plist])).stdout.trim();
  if (await value("CFBundleIdentifier") !== "com.goosenote.desktop" || await value("CFBundleShortVersionString") !== version) {
    throw new Error("更新应用的身份或版本不匹配");
  }
  const executable = path.join(bundle, "Contents", "MacOS", "Goose Note");
  const arch = (await exec("/usr/bin/lipo", ["-archs", executable])).stdout.trim().split(/\s+/);
  if (!arch.includes(process.arch === "arm64" ? "arm64" : "x86_64")) throw new Error("更新应用的架构不匹配");
}

export async function prepareMacUpdate(update: VerifiedUpdate): Promise<void> {
  const directory = path.dirname(unpackedApp(update));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await exec("/usr/bin/ditto", ["-x", "-k", update.path, directory]);
  await validateBundle(unpackedApp(update), update.version);
}

// Arguments stay separate from shell source, including app paths containing spaces.
// The old bundle remains available until the new process finishes starting.
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
rollback() {
  if [ -d "$stage/previous.app" ]; then
    if [ -e "$target" ]; then mv "$target" "$stage/failed.app"; fi
    mv "$stage/previous.app" "$target"
  fi
  /usr/bin/open "$target" || true
}
trap rollback HUP INT TERM
if ! mv "$target" "$stage/previous.app"; then /usr/bin/open "$target"; exit 1; fi
if ! mv "$stage/next.app" "$target"; then rollback; exit 1; fi
if ! /usr/bin/open "$target"; then rollback; exit 1; fi
count=0
while [ ! -f "$stage/started" ]; do
  count=$((count + 1))
  if [ "$count" -gt 60 ]; then
    if ! /usr/bin/pgrep -f "$process_pattern" >/dev/null; then rollback; fi
    exit 1
  fi
  sleep 1
done
rm -rf "$stage"
`;

async function installMac(update: VerifiedUpdate): Promise<void> {
  const target = installedApp();
  if (!target.endsWith(".app") || target.includes("/AppTranslocation/") || target.startsWith("/Volumes/")) {
    throw new Error("请先将鹅的笔记移到应用程序文件夹，再安装更新");
  }
  await access(path.dirname(target), constants.W_OK);
  // Re-extract from the verified archive so an interrupted/modified staging folder is never reused.
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
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
  markQuitting();
  app.quit();
}

export async function installUpdate(update: VerifiedUpdate): Promise<void> {
  if (process.platform === "darwin") return installMac(update);
  if (process.platform !== "win32" || !update.path.endsWith(".exe")) throw new Error("请打开已下载的安装包完成更新");
  await flushBeforeUpdate();
  const child = spawn(update.path, ["--updated", "--force-run"], { detached: true, stdio: "ignore" });
  await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  child.unref();
  markQuitting();
  app.quit();
}

export async function cleanInstalledUpdate(update: VerifiedUpdate): Promise<void> {
  if (process.platform !== "darwin") return;
  try {
    const record = JSON.parse(await readFile(stageRecord(), "utf8")) as { path: string; version: string };
    const parent = path.dirname(installedApp());
    if (record.version === update.version && path.dirname(record.path) === parent &&
        /^\.goose-update-[a-zA-Z0-9]+$/.test(path.basename(record.path))) {
      await writeFile(path.join(record.path, "started"), String(process.pid), { mode: 0o600 });
      await rm(stageRecord(), { force: true });
    }
  } catch { /* No completed installation to clean up. */ }
}
