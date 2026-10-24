import { t } from "../i18n/attachments";
import { appearanceBackgroundColor, bindWindowAppearance } from "../appearance";
import { BrowserWindow, screen } from "electron";
import {
  centeredSearchWindowBounds,
  OPEN_SEARCH_RESULT_CHANNEL,
  SEARCH_WINDOW_COMMAND_CHANNEL,
  SEARCH_WINDOW_HEIGHT,
  SEARCH_WINDOW_SHOWN_CHANNEL,
  SEARCH_WINDOW_WIDTH,
  searchCommandRaisesMainWindow,
  type OpenSearchResultPayload,
  type SearchWindowCommand,
} from "../../../src/lib/electron/searchWindow";
import {
  rendererDevUrl,
  rendererFile,
  framelessWindowIcon,
  windowWebPrefs,
  setHiddenThrottle,
  denyWindowOpenHandler,
} from "./configuration";
import {
  notifyBrowserWindowCreated,
  emitVisibilityChange,
  markQuicknoteActivateSuppressed,
} from "./visibility";
import { allocWindowId } from "./layout";
import { appQuitting, getMainWindow, getSearchWindow } from "./registry";
import { bindCloseTabAccelerator } from "./close";
import { clearIdleDestroyTimer, scheduleIdleDestroy } from "./idleDestroy";
import {
  raiseFloatingWindow,
  showOrCreateMainWindow,
  waitReadyToShow,
} from "./activation";
import { captureParkedWorkspaces, forgetParkedWorkspaces } from "./park";
import { registry, SEARCH_IDLE_DESTROY_MS } from "./state";

const RENDERER_READY_TIMEOUT_MS = 4000;
const SEARCH_SHOW_BLUR_GRACE_MS = 600;
let suppressSearchBlurUntil = 0;

function armSearchShowGuard(): void {
  if (process.platform !== "win32") return;
  suppressSearchBlurUntil = Date.now() + SEARCH_SHOW_BLUR_GRACE_MS;
}
const rendererReady = new WeakMap<BrowserWindow, { promise: Promise<void>; resolve: () => void }>();

function trackRendererReady(win: BrowserWindow): void {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    const timer = setTimeout(done, RENDERER_READY_TIMEOUT_MS);
    resolve = () => {
      clearTimeout(timer);
      done();
    };
  });
  rendererReady.set(win, { promise, resolve });
  win.once("closed", resolve);
}

export function markSearchRendererReady(win: BrowserWindow | null): void {
  if (win && win === getSearchWindow()) rendererReady.get(win)?.resolve();
}

function placeOnCursorDisplay(win: BrowserWindow): void {
  try {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    win.setBounds(centeredSearchWindowBounds(workArea));
  } catch {
  }
}

export function createSearchWindow(): BrowserWindow {
  const existing = getSearchWindow();
  if (existing) return existing;

  const id = allocWindowId();
  const isMac = process.platform === "darwin";
  const icon = framelessWindowIcon();
  const win = new BrowserWindow({
    title: t("searchTitle"),
    width: SEARCH_WINDOW_WIDTH,
    height: SEARCH_WINDOW_HEIGHT,
    show: false,
    frame: isMac,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: appearanceBackgroundColor(),
    transparent: false,
    ...(icon ? { icon } : {}),
    ...(isMac
      ? {
          titleBarStyle: "hidden" as const,
          roundedCorners: true,
          hiddenInMissionControl: true,
        }
      : {}),
    webPreferences: {
      ...windowWebPrefs(id, "search"),
      backgroundThrottling: true,
    },
  });

  bindWindowAppearance(win, false, false);
  if (isMac) {
    win.setWindowButtonVisibility(false);
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    win.setAlwaysOnTop(true, "floating");
  }

  registry.register({ id, kind: "search", win });
  trackRendererReady(win);
  denyWindowOpenHandler(win);
  bindCloseTabAccelerator(win);
  notifyBrowserWindowCreated(win, "search");

  win.on("show", () => {
    clearIdleDestroyTimer("searchDestroyTimer");
    setHiddenThrottle(win, false);
    emitVisibilityChange();
  });

  win.on("hide", () => {
    setHiddenThrottle(win, true);
    scheduleIdleDestroy(win, "searchDestroyTimer", SEARCH_IDLE_DESTROY_MS);
    emitVisibilityChange();
  });

  win.on("blur", () => {
    if (win.webContents.isDevToolsOpened()) return;
    if (Date.now() < suppressSearchBlurUntil) return;
    hideSearchWindow({ suppressActivate: false });
  });

  win.on("focus", () => {
    setHiddenThrottle(win, false);
    emitVisibilityChange();
  });

  win.on("close", () => {
    if (!appQuitting()) markQuicknoteActivateSuppressed();
  });

  win.on("closed", () => {
    registry.unregister(id);
    clearIdleDestroyTimer("searchDestroyTimer");
    emitVisibilityChange();
  });

  const devUrl = rendererDevUrl();
  if (devUrl) {
    void win.loadURL(`${devUrl}/search.html`);
  } else {
    void win.loadFile(rendererFile("search.html"));
  }
  return win;
}

export function isSearchWindowVisible(): boolean {
  const win = getSearchWindow();
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

let creating: Promise<void> | null = null;

export async function showSearchWindow(): Promise<void> {
  if (creating) return creating;
  const parked = captureParkedWorkspaces();
  let win = getSearchWindow();
  if (!win) {
    const created = createSearchWindow();
    creating = waitReadyToShow(created)
      .then(() => rendererReady.get(created)?.promise)
      .finally(() => { creating = null; });
    await creating;
    if (created.isDestroyed()) {
      forgetParkedWorkspaces(parked);
      return;
    }
    win = created;
  }
  placeOnCursorDisplay(win);
  armSearchShowGuard();
  raiseFloatingWindow(win, parked);
  if (!win.webContents.isDestroyed()) win.webContents.send(SEARCH_WINDOW_SHOWN_CHANNEL);
}

export function hideSearchWindow(opts: { suppressActivate?: boolean } = {}): void {
  const win = getSearchWindow();
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  if (opts.suppressActivate !== false) markQuicknoteActivateSuppressed();
  win.hide();
}

export async function toggleSearchWindow(): Promise<void> {
  if (isSearchWindowVisible()) {
    hideSearchWindow();
    return;
  }
  await showSearchWindow();
}

function sendWhenLoaded(win: BrowserWindow, channel: string, payload: unknown): void {
  const contents = win.webContents;
  const send = () => {
    if (!win.isDestroyed() && !contents.isDestroyed()) contents.send(channel, payload);
  };
  if (contents.isLoadingMainFrame() || !contents.getURL()) {
    contents.once("did-finish-load", send);
    return;
  }
  send();
}

export function openSearchResultInWorkspace(payload: OpenSearchResultPayload): void {
  hideSearchWindow();
  const win = showOrCreateMainWindow();
  if (win.isDestroyed()) return;
  sendWhenLoaded(win, OPEN_SEARCH_RESULT_CHANNEL, payload);
}

export function dispatchSearchWindowCommand(command: SearchWindowCommand): boolean {
  if (!searchCommandRaisesMainWindow(command.type)) {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return false;
    sendWhenLoaded(win, SEARCH_WINDOW_COMMAND_CHANNEL, command);
    return true;
  }
  hideSearchWindow();
  const win = showOrCreateMainWindow();
  if (win.isDestroyed()) return false;
  sendWhenLoaded(win, SEARCH_WINDOW_COMMAND_CHANNEL, command);
  return true;
}
