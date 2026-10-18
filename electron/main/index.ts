import { registerAppearanceIpc } from "./appearance";
import { registerGitSyncIpc, startGitSync, stopGitSync } from "./gitSync";
import { app, protocol } from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { initializeLanguage, getLanguageSnapshot } from "./i18n/store";
import { registerLanguageIpc } from "./i18n/ipc";
import { localizedAppName } from "./i18n/appName";
import { installMenu } from "./i18n/menu";
import { setLanguageSnapshot } from "../../src/i18n/core";
import { loadVaultRoots } from "./allowlist";
import { registerHotkeys, unregisterAllHotkeys } from "./hotkeys";
import { closeAllWatchers, registerIpcHandlers } from "./ipc";
import { startAutomaticUpdates } from "./appUpdate";
import {
  enqueueMarkdownPathsFromArgv,
  flushQueuedMarkdownOpenPaths,
  markOpenMarkdownRendererUnavailable,
  registerOpenFileEvent,
} from "./openMarkdownFiles";
import { lockWebContentsPageZoom } from "./pageZoom";
import { createWorkspaceWindow, getMainWindow, markQuitting, restoreWorkspaceWindows, shouldSuppressWorkspaceActivate } from "./windows";

const DEFAULT_WAKE = "CmdOrCtrl+Alt+N";
const DEFAULT_QUICKNOTE = "Alt+N";

protocol.registerSchemesAsPrivileged([{ scheme: "goose-asset", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// 显示名在语言就绪后才会换成「思绪 · Thinkly」或 Thinkly。
// 数据目录必须先钉在旧路径，否则 setName 会让升级后的笔记进新文件夹。
const legacyUserData = path.join(app.getPath("appData"), "Goose Note");
mkdirSync(legacyUserData, { recursive: true });
app.setPath("userData", legacyUserData);
app.setName("Goose Note");
// 禁止触控板捏合缩放整页；键盘 Cmd/Ctrl+/- 由渲染进程改编辑器字号。
app.commandLine.appendSwitch("disable-pinch");
// 笔记应用不用浏览器后退缓存，也不预留空闲渲染进程。
app.commandLine.appendSwitch(
  "disable-features",
  "SpareRendererForSitePerProcess,BackForwardCache",
);

if (process.platform === "linux") {
  // ponytail: Omarchy/Hyprland sets ELECTRON_OZONE_PLATFORM_HINT=wayland.
  // At scale=2 BlockNote maps mouseup onto the heading above. X11 ozone is the
  // working path; drop when Electron Wayland click/IME is reliable.
  process.env.ELECTRON_OZONE_PLATFORM_HINT = "x11";
  process.env.OZONE_PLATFORM = "x11";
  app.commandLine.appendSwitch("ozone-platform-hint", "x11");
  app.commandLine.appendSwitch("ozone-platform", "x11");
}

// macOS 双击 md 会在 ready 前发 open-file，必须尽早监听。
registerOpenFileEvent();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // quit() 异步，后续 whenReady 仍会建窗，Dock 会冒出第二个图标。
  app.exit(0);
} else {
  startApp();
}

function startApp(): void {
  let pendingFocus = false;
  let languageReady = false;

  app.on("web-contents-created", (_event, contents) => {
    lockWebContentsPageZoom(contents);
  });

  function focusExistingWorkspace(): void {
    const win = getMainWindow();
    if (!win) {
      pendingFocus = true;
      if (app.isReady() && languageReady) {
        markOpenMarkdownRendererUnavailable();
        createWorkspaceWindow({ mode: "blank" });
      }
      return;
    }
    if (win.isMinimized()) win.restore();
    win.show();
    win.moveTop();
    win.focus();
    if (process.platform === "darwin") {
      app.focus({ steal: true });
    }
  }

  app.on("second-instance", (_event, argv) => {
    enqueueMarkdownPathsFromArgv(argv);
    focusExistingWorkspace();
  });

  registerIpcHandlers();
  registerAppearanceIpc();
  registerGitSyncIpc();

  app.whenReady().then(async () => {
    await initializeLanguage();
    setLanguageSnapshot(getLanguageSnapshot());
    registerLanguageIpc();
    languageReady = true;
    app.setName(localizedAppName());
    installMenu();
    loadVaultRoots();
    enqueueMarkdownPathsFromArgv(process.argv);
    restoreWorkspaceWindows();
    flushQueuedMarkdownOpenPaths();
    registerHotkeys({
      wake: DEFAULT_WAKE,
      quicknote: DEFAULT_QUICKNOTE,
      // 等待渲染进程设置水合，避免启动时抢占用户已关闭或改过的搜索键。
      search: "",
    });
    startAutomaticUpdates();
    startGitSync();
    if (pendingFocus) {
      pendingFocus = false;
      focusExistingWorkspace();
    }
  });

  app.on("activate", () => {
    // Dock / Cmd+Tab 才拉 workspace。速记窗自己的唤出或关闭会补发
    // activate，两边没有关联，不能因此把大窗带到前台。
    if (shouldSuppressWorkspaceActivate()) return;
    focusExistingWorkspace();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    markQuitting();
    unregisterAllHotkeys();
    closeAllWatchers();
    stopGitSync();
  });
}
