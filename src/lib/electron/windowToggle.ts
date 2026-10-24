import { getGooseDesktop } from "./runtime";

export type DesktopWindowToggleTarget = "main" | "quicknote";

export type DesktopWorkspaceAction =
  | "none"
  | "search"
  | "settings"
  | "ai-panel"
  | "new-note";

export type WindowToggleAction = "hide" | "focus" | "show";

export function resolveWindowToggleAction(state: {
  visible: boolean;
  focused: boolean;
}): WindowToggleAction {
  if (!state.visible) return "show";
  if (state.focused) return "hide";
  return "focus";
}

export function shouldRaiseMainWindow(state: {
  visible: boolean;
  minimized: boolean;
  focused: boolean;
}): boolean {
  return !state.visible || state.minimized || !state.focused;
}

export function shouldKeepWorkspaceHiddenAfterQuicknote(state: {
  visible: boolean;
}): boolean {
  return !state.visible;
}

export async function toggleDesktopWindow(
  label: DesktopWindowToggleTarget,
): Promise<void> {
  const api = getGooseDesktop();
  if (!api) return;
  try {
    if (label === "quicknote") await api.toggleQuicknote();
    else await api.toggleMainWindow();
  } catch (error) {
    console.warn(`[electron] 切换窗口 ${label} 失败`, error);
  }
}

export async function showDesktopMainWindow(
  action: DesktopWorkspaceAction = "none",
): Promise<void> {
  const api = getGooseDesktop();
  if (!api?.showMainWindow) return;
  try {
    await api.showMainWindow(action);
  } catch (error) {
    console.warn("[electron] 显示主窗口失败", error);
  }
}
