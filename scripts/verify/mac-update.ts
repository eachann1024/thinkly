import * as nodeFs from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { appUpdateTransition } from "../../src/lib/appUpdateState";
import { updateLifecycleTransition, type UpdateLifecycle } from "../../electron/main/updates/lifecycle";
import {
  cleanVersionDirectories,
  describeFsError,
  isFilesystemError,
  replaceUpdateDirectory,
  type DirectoryFs,
} from "../../electron/main/updates/staging";
import { createChecker } from "./lib/check";

const checker = createChecker();
const { check } = checker;
type NoAsarProcess = NodeJS.Process & { noAsar?: boolean };

function errno(code: string, syscall: string, target: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: ${syscall} '${target}'`), { code, syscall, path: target });
}

function isAsarPath(target: string): boolean {
  return target.split(path.sep).some((part) => part.toLowerCase().endsWith(".asar"));
}

function hasAsar(target: string): boolean {
  let info: nodeFs.Stats;
  try { info = nodeFs.lstatSync(target); } catch { return false; }
  if (!info.isDirectory()) return path.basename(target).toLowerCase().endsWith(".asar");
  return nodeFs.readdirSync(target).some((name) => hasAsar(path.join(target, name)));
}

function asarParent(target: string): string {
  const stack = [target];
  while (stack.length) {
    const current = stack.pop()!;
    let info: nodeFs.Stats;
    try { info = nodeFs.lstatSync(current); } catch { continue; }
    if (!info.isDirectory()) continue;
    if (nodeFs.readdirSync(current).some((name) => name.toLowerCase().endsWith(".asar"))) return current;
    for (const name of nodeFs.readdirSync(current)) stack.push(path.join(current, name));
  }
  return target;
}

function electronAsarFs(options: { blockRemove?: boolean } = {}): DirectoryFs {
  return {
    lstatSync(target) {
      if (isAsarPath(target)) throw errno("ENOTDIR", "lstat", target);
      return nodeFs.lstatSync(target);
    },
    readdirSync(target) {
      if (isAsarPath(target)) throw errno("ENOTDIR", "readdir", target);
      return nodeFs.readdirSync(target);
    },
    unlinkSync(target) {
      if (isAsarPath(target) && !(process as NoAsarProcess).noAsar) throw errno("ENOTDIR", "unlink", target);
      nodeFs.unlinkSync(target);
    },
    renameSync: (from, to) => nodeFs.renameSync(from, to),
    async rm(target, rmOptions) {
      if ((process as NoAsarProcess).noAsar) throw errno("EBUSY", "rm", target);
      if (options.blockRemove || hasAsar(target)) throw errno("ENOTEMPTY", "rmdir", asarParent(target));
      await nodeFs.promises.rm(target, rmOptions);
    },
  };
}

async function writeBundle(directory: string, marker: string): Promise<void> {
  const resources = path.join(directory, "Thinkly.app", "Contents", "Resources");
  const frameworks = path.join(directory, "Thinkly.app", "Contents", "Frameworks");
  await mkdir(path.join(resources, "app.asar.unpacked"), { recursive: true });
  await mkdir(frameworks, { recursive: true });
  await writeFile(path.join(resources, "app.asar"), marker);
  await writeFile(path.join(frameworks, "Helper.asar"), marker);
  await writeFile(path.join(resources, "app.asar.unpacked", "keep.txt"), marker);
}

async function captureLogs(run: () => Promise<void>): Promise<string[]> {
  const logs: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
  try {
    await run();
  } finally {
    console.error = original;
  }
  return logs;
}

function checkFailureCopy(): void {
  const native = errno("ENOTEMPTY", "rmdir", "/Users/eachann/Library/Application Support/Thinkly/app-updates/1.7.323/unpacked/Thinkly.app/Contents/Resources");
  const described = describeFsError(native);
  check("系统错误保留 errno", described.includes("ENOTEMPTY"), described);
  check("系统错误保留路径", described.includes("/Users/eachann/Library/Application Support/Thinkly/app-updates/1.7.323/unpacked/Thinkly.app/Contents/Resources"), described);
  const wrapped = Object.assign(new Error("directory not empty"), { code: "ENOTEMPTY", path: "/tmp/Resources" });
  const wrappedText = describeFsError(wrapped);
  check("缺少原文时补上 errno 和路径", wrappedText.startsWith("ENOTEMPTY:") && wrappedText.includes("/tmp/Resources"), wrappedText);
  check("普通失败不是文件系统错误", !isFilesystemError(new Error("请先将思绪 · Thinkly 移到应用程序文件夹，再安装更新")));
  check("ENOTEMPTY 是文件系统错误", isFilesystemError(native));

  const target = { version: "1.7.323", assetName: "Thinkly-mac.zip", downloadUrl: "https://example.test/Thinkly-mac.zip" };
  const ready = { ...target, status: "ready" as const, downloadPath: "/tmp/Thinkly-mac.zip" };
  const kept = appUpdateTransition(ready, { type: "install.failed", target, path: ready.downloadPath, message: "Move Thinkly to the Applications folder" });
  check("非文件系统失败仍可原地点重试", kept.status === "ready" && kept.message?.includes("Applications"));
  const cleared = appUpdateTransition(ready, { type: "install.failed", target, message: described });
  check("文件系统失败不再停在 ready", cleared.status === "error" && cleared.message === described);

  const update = { version: "1.7.323", path: "/tmp/a.zip", asset: { name: "a.zip", browser_download_url: "https://example.test/a.zip" } };
  let lifecycle: UpdateLifecycle = { phase: "ready", update };
  lifecycle = updateLifecycleTransition(lifecycle, { type: "install.started" });
  lifecycle = updateLifecycleTransition(lifecycle, { type: "install.invalidated" });
  lifecycle = updateLifecycleTransition(lifecycle, { type: "install.finished" });
  check("安装失败后生命周期回到空闲", lifecycle.phase === "empty");
}

async function checkPrepare(root: string, fsImpl: DirectoryFs | undefined, label: string, expectTrash: boolean): Promise<void> {
  const directory = path.join(root, "unpacked");
  await mkdir(root, { recursive: true });
  await writeBundle(directory, "stale");
  await writeFile(path.join(directory, "partial.txt"), "half-extracted");
  const options = fsImpl ? { fs: fsImpl } : {};
  let seenEmpty = false;
  await replaceUpdateDirectory(directory, async (next) => {
    seenEmpty = (await readdir(next)).length === 0;
    await writeBundle(next, "first");
  }, options);
  await replaceUpdateDirectory(directory, async (next) => {
    const names = await readdir(next);
    check(`${label}：第二次准备从空目录开始`, names.length === 0, names);
    await writeBundle(next, "second");
  }, options);
  const resources = path.join(directory, "Thinkly.app", "Contents", "Resources");
  const marker = await readFile(path.join(resources, "app.asar"), "utf8");
  const helper = await readFile(path.join(directory, "Thinkly.app", "Contents", "Frameworks", "Helper.asar"), "utf8");
  const trash = (await readdir(root)).filter((name) => name.includes(".trash-"));
  check(`${label}：残留半成品被换掉`, seenEmpty && marker === "second" && helper === "second", { seenEmpty, marker, helper });
  check(`${label}：半成品文件没有留在新目录`, !nodeFs.existsSync(path.join(directory, "partial.txt")));
  const stat = nodeFs.lstatSync(path.join(resources, "app.asar"));
  check(`${label}：app.asar 仍是文件`, stat.isFile() && !stat.isDirectory());
  check(expectTrash ? `${label}：删不掉的目录被挪到旁边` : `${label}：挪走的目录已经删掉`, expectTrash ? trash.length > 0 : trash.length === 0, trash);
}

async function checkStaging(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "thinkly-mac-update-"));
  const previous = (process as NoAsarProcess).noAsar;
  try {
    await checkPrepare(path.join(root, "asar"), electronAsarFs(), "asar 补丁", false);
    const blockedLogs = await captureLogs(() => checkPrepare(path.join(root, "blocked"), electronAsarFs({ blockRemove: true }), "删除失败", true));
    check("删除失败仍完成准备", nodeFs.existsSync(path.join(root, "blocked", "unpacked", "Thinkly.app", "Contents", "Resources", "app.asar")));
    check("删除失败记下 errno 和路径", blockedLogs.some((line) => line.includes("ENOTEMPTY") && line.includes("rmdir") && line.includes("unpacked")), blockedLogs);

    const updates = path.join(root, "app-updates");
    await mkdir(updates, { recursive: true });
    for (const version of ["1.7.321", "1.7.322", "1.7.323"]) {
      await writeBundle(path.join(updates, version, "unpacked"), version);
    }
    await writeFile(path.join(updates, "ready.json"), "{\"version\":\"1.7.323\"}");
    await writeFile(path.join(updates, "install.log"), "log");
    await writeBundle(path.join(updates, ".1.7.321.trash-0123abcd", "unpacked"), "trash");
    const logs = await captureLogs(() => cleanVersionDirectories(updates, "1.7.323", { fs: electronAsarFs() }));
    check("旧版本目录连同 asar 被清掉", !nodeFs.existsSync(path.join(updates, "1.7.321")) && !nodeFs.existsSync(path.join(updates, "1.7.322")));
    check("旧 trash 被清掉", !nodeFs.existsSync(path.join(updates, ".1.7.321.trash-0123abcd")));
    const kept = await readFile(path.join(updates, "1.7.323", "unpacked", "Thinkly.app", "Contents", "Resources", "app.asar"), "utf8");
    check("当前准备安装的版本还在", kept === "1.7.323" && nodeFs.existsSync(path.join(updates, "ready.json")) && nodeFs.existsSync(path.join(updates, "install.log")), kept);
    check("清理成功时不报错", logs.length === 0, logs);

    const outside = path.join(root, "notes");
    await mkdir(path.join(outside, "1.7.321"), { recursive: true });
    await writeFile(path.join(outside, "1.7.321", "page.md"), "note");
    const refused = await captureLogs(() => cleanVersionDirectories(outside, null, { fs: electronAsarFs() }));
    check("不清理 app-updates 以外的目录", nodeFs.existsSync(path.join(outside, "1.7.321", "page.md")) && refused.some((line) => line.includes("app-updates")));

    await checkPrepare(path.join(root, "node-fs"), undefined, "真实文件系统", false);
    check("noAsar 不会留在进程上", (process as NoAsarProcess).noAsar === previous);
  } finally {
    if (previous === undefined) delete (process as NoAsarProcess).noAsar;
    else (process as NoAsarProcess).noAsar = previous;
    await rm(root, { recursive: true, force: true });
  }
}

function checkWiring(): void {
  const root = process.cwd();
  const install = nodeFs.readFileSync(path.join(root, "electron/main/updates/install.ts"), "utf8");
  const appUpdate = nodeFs.readFileSync(path.join(root, "electron/main/appUpdate.ts"), "utf8");
  check("准备更新先换掉旧目录", install.includes("replaceUpdateDirectory") && !install.includes("await rm(directory"));
  check("安装失败会清掉 ready 并重新下载", appUpdate.includes("forgetReadyUpdate") && appUpdate.includes("isFilesystemError") && appUpdate.includes("downloading again"));
  check("启动时清理旧版本目录", appUpdate.includes("cleanVersionDirectories"));
}

export default async function run(): Promise<number> {
  checkFailureCopy();
  checkWiring();
  await checkStaging();
  return checker.failed;
}
