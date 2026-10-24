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

/** 渲染层首帧挂载完成后才显示，避免空白 root 闪一下。 */
const RENDERER_READY_TIMEOUT_MS = 4000;
/** Windows 上 show 常常先 blur 一次，失焦收起会把刚唤出的搜索窗立刻关掉。 */
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

/** 搜索窗渲染层挂载后通过 IPC 调用。 */
export function markSearchRendererReady(win: BrowserWindow | null): void {
  if (win && win === getSearchWindow()) rendererReady.get(win)?.resolve();
}

function placeOnCursorDisplay(win: BrowserWindow): void {
  try {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    win.setBounds(centeredSearchWindowBounds(workArea));
  } catch {
    // 读不到显示器信息时保持上次位置。
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
    // macOS 保留原生框架拿系统圆角与阴影，隐藏标题栏和红绿灯。
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
    // 不用 panel。macOS 的 panel 一显示就会把同应用的普通窗口收起。
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

  // 只订阅外观，不向其他窗口发布。
  bindWindowAppearance(win, false, false);
  if (isMac) {
    win.setWindowButtonVisibility(false);
    // 面板自己会加入全部空间。不改进程激活策略，避免 DockHide 把已最小化的主窗放出来。
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

  // 失焦即收起（点到其他窗口或应用）；调试时打开 DevTools 不收起。
  // 焦点已离开，收起不会再触发 activate；点 Dock 带来的 activate 是真实意图，不压制。
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
  // 首次创建期间再按热键：等同一次创建完成，不在 renderer 就绪前提前显示。
  if (creating) return creating;
  // 创建 BrowserWindow 可能激活应用。先记下主窗，再用这份快照抬搜索窗。
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

/** 主动收起（Esc、热键、打开结果）时压制随之而来的 activate，避免把主窗带到前台。 */
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

/** 新建的主窗还没加载 preload 时，send 会丢；等主框架加载完再发，preload 负责缓存到渲染层订阅。 */
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

/** 先收起搜索窗再唤出主窗，由主窗沿用应用内搜索的打开路径。 */
export function openSearchResultInWorkspace(payload: OpenSearchResultPayload): void {
  hideSearchWindow();
  const win = showOrCreateMainWindow();
  if (win.isDestroyed()) return;
  sendWhenLoaded(win, OPEN_SEARCH_RESULT_CHANNEL, payload);
}

/** 隐藏最近、归档问答只通知已存在的主窗，不把主窗带到前台。其余动作先收起搜索窗再唤出主窗。 */
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
