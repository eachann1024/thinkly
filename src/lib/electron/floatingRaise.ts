
export type WorkspaceSurface = {
  visible: boolean;
  minimized: boolean;
  focused: boolean;
};

export type ParkedWorkspace = "minimized" | "hidden";

export function parkedWorkspaceKind(
  state: WorkspaceSurface,
): ParkedWorkspace | null {
  if (state.minimized) return "minimized";
  if (!state.visible) return "hidden";
  return null;
}

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

export function shouldOrderFloatingWithFocusedWorkspace(
  workspaceFocused: boolean,
): boolean {
  return workspaceFocused;
}
