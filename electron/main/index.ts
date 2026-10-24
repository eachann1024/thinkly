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
installPerfInstrumentation();

pinUserDataDirectory();
markStartup("userdata-pinned");
app.setName("Thinkly");
app.commandLine.appendSwitch("disable-pinch");
app.commandLine.appendSwitch(
  "disable-features",
  "SpareRendererForSitePerProcess,BackForwardCache",
);

if (process.platform === "linux") {
  process.env.ELECTRON_OZONE_PLATFORM_HINT = "x11";
  process.env.OZONE_PLATFORM = "x11";
  app.commandLine.appendSwitch("ozone-platform-hint", "x11");
  app.commandLine.appendSwitch("ozone-platform", "x11");
}

registerOpenFileEvent();

const gotLock = app.requestSingleInstanceLock();
markStartup("single-instance-lock", { gotLock });
if (!gotLock) {
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
