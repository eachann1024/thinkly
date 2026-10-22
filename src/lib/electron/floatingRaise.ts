/**
 * macOS 上抬浮动窗（全局搜索、速记）时，主窗该保持的状态。
 * 纯函数，主进程与验收脚本共用，不依赖 Electron。
 *
 * show / focus / moveTop 都会激活整个应用：已最小化的主窗被 deminiaturize，
 * 藏在其他 app 后面的主窗被带到前面。浮动窗和主窗没有这层关联。
 */

export type WorkspaceSurface = {
  visible: boolean;
  minimized: boolean;
  focused: boolean;
};

/** 唤出浮动窗之前主窗的停放方式。最小化优先：那时 isVisible 也常为 false，不能当成 hide。 */
export type ParkedWorkspace = "minimized" | "hidden";

export function parkedWorkspaceKind(
  state: WorkspaceSurface,
): ParkedWorkspace | null {
  if (state.minimized) return "minimized";
  if (!state.visible) return "hidden";
  return null;
}

/**
 * 系统把主窗误抬起来之后，允许做的纠正。
 * 已最小化：再最小化。已隐藏：再隐藏。不会 show，也不会 restore。
 */
/** show / restore 事件里主窗正在被抬到前面。只按回原状态，不 show、不 restore。 */
export function comingForwardOp(parked: ParkedWorkspace): "minimize" | "hide" {
  return parked === "minimized" ? "minimize" : "hide";
}

export function correctionForParked(
  parked: ParkedWorkspace,
  now: { visible: boolean; minimized: boolean },
): "minimize" | "hide" | null {
  if (parked === "minimized") return now.minimized ? null : "minimize";
  if (now.visible && !now.minimized) return "hide";
  return null;
}

/**
 * 只有主窗本来就在前台时，才把浮动窗和它一起排到最前。
 * 人在别的 app、或主窗已最小化时，moveTop 用的 orderWindow 会把主窗一并带出来。
 */
export function shouldOrderFloatingWithFocusedWorkspace(
  workspaceFocused: boolean,
): boolean {
  return workspaceFocused;
}
