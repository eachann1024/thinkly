export {
  MAIN_WIDTH,
  MAIN_HEIGHT,
  QUICKNOTE_WIDTH,
  QUICKNOTE_HEIGHT,
  TITLE_BAR_HEIGHT,
  type CreateWorkspaceWindowOpts,
  setMainWindowTitleBarHeight,
} from "./windows/configuration";
export {
  onBrowserWindowCreated,
  markQuicknoteActivateSuppressed,
  shouldSuppressWorkspaceActivate,
  hasVisibleWindow,
  onWindowVisibilityChange,
} from "./windows/visibility";
export { persistWindowLayout } from "./windows/layout";
export {
  createWorkspaceWindow,
  createMainWindow,
  restoreWorkspaceWindows,
} from "./windows/workspace";
export {
  getAssetMaintenanceWindow,
  createAssetMaintenanceWindow,
} from "./windows/maintenance";
export { createQuicknoteWindow } from "./windows/quicknote";
export {
  markQuitting,
  lookupWindowContext,
  currentTitleBarHeight,
  type WorkspaceDockSurface,
  listWorkspaceDockSurfaces,
  sendToWorkspace,
  workspaceOuterBounds,
  closeWorkspaceWindow,
  getMainWindow,
  getQuicknoteWindow,
  getSearchWindow,
  broadcast,
} from "./windows/registry";
export {
  toggleWindow,
  toggleQuicknoteWindow,
  closeQuicknote,
  showAndFocusMainWindow,
  showOrCreateMainWindow,
  focusedWorkspaceWindow,
} from "./windows/activation";
export {
  toggleSearchWindow,
  hideSearchWindow,
  isSearchWindowVisible,
  markSearchRendererReady,
  openSearchResultInWorkspace,
} from "./windows/search";
export { requestCloseActiveTab } from "./windows/close";
