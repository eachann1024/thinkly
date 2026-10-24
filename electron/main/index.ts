import { registerAppearanceIpc } from "./appearance";
import { registerGitSyncIpc, startGitSync, stopGitSync } from "./gitSync";
import { app, protocol } from "electron";
import { initializeLanguage, getLanguageSnapshot } from "./i18n/store";
import { registerLanguageIpc } from "./i18n/ipc";
import { localizedAppName } from "./i18n/appName";
import { installMenu } from "./i18n/menu";
import { setLanguageSnapshot } from "../../src/i18n/core";
import { loadVaultRoots } from "./allowlist";
import { registerHotkeys, unregisterAllHotkeys } from "./hotkeys";
import { closeAllWatchers, registerIpcHandlers } from "./ipc";
import { startAutomaticUpdates } from "./appUpdate";
import { acknowledgeMacInstall } from "./updates/install";
import {
  enqueueMarkdownPathsFromArgv,
  flushQueuedMarkdownOpenPaths,
  markOpenMarkdownRendererUnavailable,
  registerOpenFileEvent,
} from "./openMarkdownFiles";
import { lockWebContentsPageZoom } from "./pageZoom";
import { pinUserDataDirectory } from "./migrateUserData";
import { installPerfInstrumentation, markStartup, timeStartupPhase } from "./perf";
import { releaseHeldWorkspace } from "../../src/lib/electron/heldWorkspace";
import { createWorkspaceWindow, getMainWindow, markQuitting, restoreWorkspaceWindows, shouldSuppressWorkspaceActivate } from "./windows";
import { workspacesHeldHidden } from "./windows/state";

const DEFAULT_WAKE = "CmdOrCtrl+Alt+N";
const DEFAULT_QUICKNOTE = "Alt+N";

protocol.registerSchemesAsPrivileged([{ scheme: "goose-asset", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
// GOOSE_PERF_LOG 未设置时全部 no-op；设置了就记录启动各阶段与首帧稳定时刻。
installPerfInstrumentation();

// 显示名在语言就绪后才会换成「思绪 · Thinkly」或 Thinkly。
// 数据目录先钉死，否则后面的 setName 会把笔记写进另一份文件夹。
pinUserDataDirectory();
markStartup("userdata-pinned");
app.setName("Thinkly");
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
markStartup("single-instance-lock", { gotLock });
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
    // 浮动窗把工作区按在隐藏集合里时，show 会立刻再藏回去。
    releaseHeldWorkspace(workspacesHeldHidden, win);
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
    // Before the installer gives up: mark the new app started and remove swap directories
    // so previous.app / failed.app are not left in the Applications folder.
    await acknowledgeMacInstall();
    markStartup("language-init-start");
    await initializeLanguage();
    setLanguageSnapshot(getLanguageSnapshot());
    registerLanguageIpc();
    languageReady = true;
    markStartup("language-init-end");
    app.setName(localizedAppName());
    timeStartupPhase("install-menu", installMenu);
    timeStartupPhase("load-vault-roots", loadVaultRoots);
    enqueueMarkdownPathsFromArgv(process.argv);
    markStartup("restore-windows-start");
    restoreWorkspaceWindows();
    markStartup("restore-windows-end");
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
