import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, lstat, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { hasNewAppUpdate } from "../../src/lib/appUpdateAvailability";
import { canClearInstallStage, readyVersionIsNewer } from "../../src/lib/appUpdateRelease";
import { isUpdateStageName, livesInUpdateStage, removeSiblingUpdateStages } from "../../electron/main/updates/installStages";
import { createChecker } from "./lib/check";

const checker = createChecker();
const { check } = checker;

async function marker(file: string, body: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function exists(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch {
    return false;
  }
}

function checkSameVersion(): void {
  const ready = {
    status: "ready" as const,
    version: "1.7.326",
    assetName: "Thinkly-mac.zip",
    downloadUrl: "https://example.test/Thinkly-mac.zip",
    downloadPath: "/tmp/Thinkly-1.7.326-mac.zip",
  };
  check("当前已是 v1.7.326 时不再提示这一条",
    !readyVersionIsNewer("1.7.326", "1.7.326") && !hasNewAppUpdate("1.7.326", ready));
  check("还没装上时仍提示 v1.7.326",
    readyVersionIsNewer("1.7.326", "1.7.325") && hasNewAppUpdate("1.7.325", ready));
  check("更高版本仍会提示",
    readyVersionIsNewer("1.7.327", "1.7.326") && hasNewAppUpdate("1.7.326", { ...ready, version: "1.7.327" }));
  check("比正在换上的版本更旧时不删舞台",
    !canClearInstallStage("1.7.325", "1.7.326") && canClearInstallStage("1.7.326", "1.7.326")
    && canClearInstallStage("1.7.327", "1.7.326") && canClearInstallStage("1.7.326", null));
  check("舞台目录名只匹配安装换包目录",
    isUpdateStageName(".goose-update-Ab12") && !isUpdateStageName("Thinkly.app")
    && !isUpdateStageName("failed.app") && !isUpdateStageName("previous.app")
    && !isUpdateStageName(".goose-update-") && !isUpdateStageName(".goose-update-a/b"));
}

async function checkStages(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "thinkly-update-stage-"));
  const outside = await mkdtemp(path.join(tmpdir(), "thinkly-update-outside-"));
  try {
    const thinkly = path.join(root, "Thinkly.app");
    const named = path.join(root, "思绪 · Thinkly.app");
    const notes = path.join(root, "Notes.app");
    const decoy = path.join(root, "failed.app");
    const success = path.join(root, ".goose-update-Ok123");
    const failed = path.join(root, ".goose-update-Bad456");
    const nested = path.join(root, "Backup", ".goose-update-zzz", "previous.app");
    await marker(path.join(thinkly, "Contents", "MacOS", "Thinkly"), "app");
    await marker(path.join(named, "Contents", "Info.plist"), "name");
    await marker(path.join(notes, "keep.txt"), "notes");
    await marker(path.join(decoy, "keep.txt"), "decoy");
    await marker(path.join(success, "started"), "1");
    await marker(path.join(failed, "previous.app", "Contents", "MacOS", "Thinkly"), "old");
    await marker(path.join(failed, "failed.app", "Contents", "MacOS", "Thinkly"), "half");
    await marker(path.join(nested, "keep.txt"), "nested");
    await marker(path.join(outside, "secret.txt"), "secret");
    await symlink(outside, path.join(root, ".goose-update-link"), "dir");
    await writeFile(path.join(root, ".goose-update-note"), "not-a-directory");

    const fromLeftover = await removeSiblingUpdateStages(path.join(failed, "previous.app"));
    check("从 previous.app 里启动不会清掉真正的应用",
      fromLeftover.length === 0 && livesInUpdateStage(path.join(failed, "previous.app"))
      && await exists(path.join(thinkly, "Contents", "MacOS", "Thinkly"))
      && await exists(path.join(failed, "previous.app")));

    const removed = await removeSiblingUpdateStages(thinkly);
    check("成功安装后舞台被删掉",
      removed.includes(".goose-update-Ok123") && !await exists(success), removed);
    check("失败留下的 previous.app 和 failed.app 被清掉",
      removed.includes(".goose-update-Bad456")
      && !await exists(path.join(failed, "previous.app"))
      && !await exists(path.join(failed, "failed.app"))
      && !await exists(failed));
    check("不删除真正的 Thinkly.app", await exists(path.join(thinkly, "Contents", "MacOS", "Thinkly")));
    check("不删除显示名相同的其他副本", await exists(path.join(named, "Contents", "Info.plist")));
    check("不删除旁边的其他应用", await exists(path.join(notes, "keep.txt")) && await exists(path.join(decoy, "keep.txt")));
    check("不删除嵌套在其他目录里的舞台", await exists(path.join(nested, "keep.txt")));
    check("不顺着同名符号链接删到外面", await exists(path.join(outside, "secret.txt")) && await exists(path.join(root, ".goose-update-link")));
    check("同名文件不是安装舞台", await exists(path.join(root, ".goose-update-note")));
    const leftoverStages: string[] = [];
    for (const name of await readdir(root)) {
      if (name.includes(".trash-")) leftoverStages.push(name);
      else if (isUpdateStageName(name)) {
        const info = await lstat(path.join(root, name));
        if (!info.isSymbolicLink() && info.isDirectory()) leftoverStages.push(name);
      }
    }
    check("清完后同级不留下换包目录或 trash", leftoverStages.length === 0, leftoverStages);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
}

function checkInstallerDeletesStage(): void {
  const source = readFileSync(path.join(process.cwd(), "electron/main/updates/install.ts"), "utf8");
  const script = source.slice(source.indexOf("const installer"), source.indexOf("async function installMac"));
  check("新进程写好 started 之后会删掉舞台", /while \[ ! -f "\$stage\/started" \];[\s\S]*\nremove_stage\n/.test(script));
  check("新进程已经在跑时也会删掉舞台", /pgrep[\s\S]*\n\s*remove_stage\n\s*exit 0/.test(script));
  check("换回旧包之后会删掉 failed.app 所在的舞台", /rollback\(\) \{[\s\S]*remove_stage\n\}/.test(script));
}

export default async function run(): Promise<number> {
  checkSameVersion();
  checkInstallerDeletesStage();
  await checkStages();
  return checker.failed;
}
