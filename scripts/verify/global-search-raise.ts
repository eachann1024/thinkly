import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import { resolveSearchHotkeySurface } from "../../src/lib/electron/searchWindow";
import { shouldRaiseMainWindow } from "../../src/lib/electron/windowToggle";
import {
  comingForwardOp,
  correctionForParked,
  parkedWorkspaceKind,
  shouldOrderFloatingWithFocusedWorkspace,
  type WorkspaceSurface,
} from "../../src/lib/electron/floatingRaise";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

type MainOp = "minimize" | "hide" | "move-top" | "show" | "restore";

/** 全局唤出浮动窗时，主窗实际会收到的操作。系统可能先把最小化窗口还原。 */
function replay(state: WorkspaceSurface, broughtForward: boolean): { ops: MainOp[]; minimized: boolean; visible: boolean } {
  const parked = parkedWorkspaceKind(state);
  const ops: MainOp[] = [];
  let now = { visible: state.visible, minimized: state.minimized };
  if (broughtForward && parked) {
    now = { visible: true, minimized: false };
    const op = comingForwardOp(parked);
    ops.push(op);
    if (op === "minimize") now = { visible: false, minimized: true };
    if (op === "hide") now = { visible: false, minimized: false };
  }
  if (parked) {
    const again = correctionForParked(parked, now);
    if (again) ops.push(again);
  }
  if (shouldOrderFloatingWithFocusedWorkspace(state.focused)) ops.push("move-top");
  return { ops, minimized: now.minimized, visible: now.visible };
}

function sliceFn(source: string, name: string, next: string): string {
  const start = source.indexOf(`export function ${name}`);
  const end = source.indexOf(`export ${next}`, start + 1);
  return source.slice(start, end === -1 ? undefined : end);
}

/** 全局搜索唤出浮动窗时，不 show / restore 已最小化或已隐藏的主窗。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const forbidden = (ops: MainOp[]) => ops.includes("show") || ops.includes("restore");

  console.log("· 已最小化的主窗");
  const minimized: WorkspaceSurface = { visible: false, minimized: true, focused: false };
  check("先认成最小化，而不是隐藏", parkedWorkspaceKind(minimized) === "minimized");
  const restored = replay(minimized, true);
  check("系统还原之后只最小化回去", restored.ops.join(",") === "minimize" && restored.minimized, restored);
  check("不 show / restore 已最小化的主窗", !forbidden(restored.ops), restored.ops);
  const stayed = replay(minimized, false);
  check("系统没动它时主进程也不碰它", stayed.ops.length === 0 && stayed.minimized, stayed);
  check("不和浮动窗一起置顶", !restored.ops.includes("move-top") && !shouldOrderFloatingWithFocusedWorkspace(false));

  console.log("· 已隐藏或在其他 app 后面");
  const hidden: WorkspaceSurface = { visible: false, minimized: false, focused: false };
  const unhidden = replay(hidden, true);
  check("隐藏的主窗被放出来时再隐藏", unhidden.ops.join(",") === "hide" && !unhidden.visible, unhidden);
  check("不 show / restore 已隐藏的主窗", !forbidden(unhidden.ops));
  const behind: WorkspaceSurface = { visible: true, minimized: false, focused: false };
  const left = replay(behind, false);
  check("可见但未聚焦的主窗不置顶、不显示", left.ops.length === 0, left.ops);
  check("纠正动作只有最小化或隐藏", comingForwardOp("minimized") === "minimize" && comingForwardOp("hidden") === "hide" && correctionForParked("minimized", { visible: true, minimized: false }) === "minimize");

  console.log("· 人已经在主窗里");
  check(
    "全局热键仍打开应用内搜索",
    resolveSearchHotkeySurface({
      fromWindowInput: false,
      sourceKind: "workspace",
      workspaceFocused: true,
      searchVisible: false,
    }) === "in-app",
  );
  check(
    "主窗未聚焦时仍只开浮动窗",
    resolveSearchHotkeySurface({
      fromWindowInput: false,
      sourceKind: "workspace",
      workspaceFocused: false,
      searchVisible: false,
    }) === "show-floating",
  );
  check(
    "应用内按键仍打开应用内搜索",
    resolveSearchHotkeySurface({
      fromWindowInput: true,
      sourceKind: "workspace",
      workspaceFocused: true,
      searchVisible: false,
    }) === "in-app",
  );
  check("主动唤出已最小化的主窗仍会显示", shouldRaiseMainWindow({ visible: false, minimized: true, focused: false }));
  check("已经在前台的主窗不重复显示", !shouldRaiseMainWindow({ visible: true, minimized: false, focused: true }));
  const focused = replay({ visible: true, minimized: false, focused: true }, false);
  check("主窗已在前台时只许把浮动窗叠上去", focused.ops.join(",") === "move-top" && !forbidden(focused.ops), focused.ops);

  console.log("· 主进程接线");
  const activation = read("electron/main/windows/activation.ts");
  const raise = sliceFn(activation, "raiseFloatingWindow", "async function toggleWindow");
  const darwinAt = raise.indexOf('if (process.platform === "darwin")');
  const winAt = raise.indexOf('} else if (process.platform === "win32")');
  const darwin = raise.slice(darwinAt, winAt);
  check("darwin 用 showInactive，不 moveTop", darwin.includes("showInactive") && !darwin.includes("moveTop") && !darwin.includes(".show(") && !darwin.includes(".restore("), darwin.trim());
  check("Windows 仍抢前台", raise.includes('process.platform === "win32"') && raise.includes("claimWindowsForeground(win)"));
  check("停放已最小化的主窗", raise.includes("captureParkedWorkspaces") && raise.includes("settleParkedWorkspaces"));
  check("只有已聚焦的主窗才一起置顶", raise.includes("shouldOrderFloatingWithFocusedWorkspace"));
  check("主动显示主窗会放开停放", activation.includes("releaseWorkspacePark"));
  check(
    "Windows 抢前台实现还在",
    activation.includes("function claimWindowsForeground") && activation.includes("setAlwaysOnTop(true)"),
  );
  const search = read("electron/main/windows/search.ts");
  check(
    "搜索窗不全空间显示时改激活策略",
    /setVisibleOnAllWorkspaces\(\s*true,\s*\{[^}]*skipTransformProcessType:\s*true/s.test(search),
  );
  const workspace = read("electron/main/windows/workspace.ts");
  const restraints = workspace.match(/restrainParkedWorkspace/g)?.length ?? 0;
  check("主窗 show 与 restore 会按住误抬起的窗口", workspace.includes('win.on("show"') && workspace.includes('win.on("restore"') && restraints >= 3, restraints);
  const quicknote = read("electron/main/windows/quicknote.ts");
  check("速记仍走同一套浮动唤出", activation.includes("raiseFloatingWindow(win)") && quicknote.includes('type: "panel"'));

  return checker.failed;
}
