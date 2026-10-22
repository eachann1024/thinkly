import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import { releaseHeldWorkspace } from "../../src/lib/electron/heldWorkspace";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
}

function focusExistingWorkspace(source: string): string {
  const start = source.indexOf("function focusExistingWorkspace()");
  const next = source.indexOf("\n  app.on(", start);
  return source.slice(start, next);
}

/** 聚焦已有工作区：放开隐藏停放，且不调用未定义的名字。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const index = read("electron/main/index.ts");
  const focus = focusExistingWorkspace(index);
  const files: string[] = [];
  walk(path.join(root, "electron"), files);
  walk(path.join(root, "src/lib/electron"), files);
  const undefinedName = files.some((file) => readFileSync(file, "utf8").includes("releaseHeldWorkspace2"));

  console.log("· 未定义的名字");
  check("主进程和窗口纯函数里没有 releaseHeldWorkspace2", !undefinedName);
  check("聚焦函数本身也不调用它", !focus.includes("releaseHeldWorkspace2"));
  const definitions = files.reduce((count, file) => {
    const text = readFileSync(file, "utf8");
    return count + (text.match(/function releaseHeldWorkspace\b/g)?.length ?? 0);
  }, 0);
  check("releaseHeldWorkspace 只有一处定义", definitions === 1, definitions);

  console.log("· 调用顺序");
  const releaseAt = focus.indexOf("releaseHeldWorkspace(workspacesHeldHidden, win)");
  const restoreAt = focus.indexOf("if (win.isMinimized()) win.restore()");
  const showAt = focus.indexOf("win.show()");
  check("先放开停放，再还原最小化，再显示", releaseAt >= 0 && releaseAt < restoreAt && restoreAt < showAt, { releaseAt, restoreAt, showAt });
  check("没有窗口时仍先返回，不放开空引用", focus.indexOf("return;") < releaseAt);
  check("macOS 仍让应用抢到前台", focus.includes('process.platform === "darwin"') && focus.includes("app.focus({ steal: true })"));
  check("聚焦路径不改 Windows 抢前台", !focus.includes("claimWindowsForeground") && !focus.includes("setAlwaysOnTop"));

  console.log("· 放开停放");
  const win = {};
  const held = new Set([win]);
  releaseHeldWorkspace(held, win);
  check("集合成员被放开", !held.has(win));
  const other = {};
  const rest = new WeakSet([other]);
  releaseHeldWorkspace(rest, win);
  check("放开别的窗口不会误删仍停放的窗口", rest.has(other));
  let threw = false;
  try {
    releaseHeldWorkspace(new Set<object>(), win);
  } catch {
    threw = true;
  }
  check("放开未停放的窗口不抛错", !threw);
  const parked = new Set([win]);
  releaseHeldWorkspace(parked, win);
  const shown = parked.has(win) ? "hide" : "show";
  check("放开之后 show 不会被停放逻辑收回", shown === "show", shown);

  const workspace = read("electron/main/windows/workspace.ts");
  check("显示回调仍认同一套隐藏集合", workspace.includes("workspacesHeldHidden.has(win)"));

  return checker.failed;
}
