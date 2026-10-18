import {
  resolveSearchHotkeySurface,
  type SearchHotkeySource,
} from "../../src/lib/electron/searchWindow";
import {
  focusedWorkspaceWindow,
  getMainWindow,
  getQuicknoteWindow,
  getSearchWindow,
  hideSearchWindow,
  isSearchWindowVisible,
  showOrCreateMainWindow,
  toggleQuicknoteWindow,
  toggleSearchWindow,
  toggleWindow,
} from "./windows";

/** 三条全局热键的分发：系统 globalShortcut 不带来源窗口，before-input-event 带上聚焦窗的种类。 */
export type HotkeySlot = "wake" | "quicknote" | "search";
export type HotkeySourceKind = SearchHotkeySource;

const HOTKEY_DEDUP_MS = 80;
let lastHotkeyAt = 0;
let lastHotkeySlot: HotkeySlot | "" = "";

function acceptHotkey(slot: HotkeySlot): boolean {
  const now = Date.now();
  if (slot === lastHotkeySlot && now - lastHotkeyAt < HOTKEY_DEDUP_MS) {
    return false;
  }
  lastHotkeyAt = now;
  lastHotkeySlot = slot;
  return true;
}

function focusedWindowKind(): HotkeySourceKind {
  const search = getSearchWindow();
  if (search && !search.isDestroyed() && search.isFocused()) return "search";
  const quicknote = getQuicknoteWindow();
  if (quicknote && !quicknote.isDestroyed() && quicknote.isFocused()) {
    return "quicknote";
  }
  return "workspace";
}

/** 聚焦的 workspace 内用应用内搜索面板；其余情况（应用不在前台、速记前台）切换浮动搜索窗。 */
function dispatchSearchHotkey(
  sourceKind: HotkeySourceKind,
  fromWindowInput: boolean,
): void {
  const surface = resolveSearchHotkeySurface({
    fromWindowInput,
    sourceKind,
    workspaceFocused: Boolean(focusedWorkspaceWindow()),
    searchVisible: isSearchWindowVisible(),
  });
  if (surface === "hide-floating") {
    hideSearchWindow();
    return;
  }
  if (surface === "show-floating") {
    void toggleSearchWindow();
    return;
  }
  const win = showOrCreateMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("desktop:open-search");
  }
}

export function dispatchRegisteredGlobalHotkey(
  slot: HotkeySlot,
  sourceKind?: HotkeySourceKind,
): void {
  if (!acceptHotkey(slot)) return;
  const fromWindowInput = sourceKind !== undefined;
  const kind = sourceKind ?? focusedWindowKind();
  if (slot === "quicknote") {
    void toggleQuicknoteWindow();
    return;
  }
  if (slot === "search") {
    dispatchSearchHotkey(kind, fromWindowInput);
    return;
  }
  if (kind === "search") hideSearchWindow();
  if (kind === "quicknote" || kind === "search") {
    showOrCreateMainWindow();
    return;
  }
  void toggleWindow(getMainWindow());
}
