/// <reference types="vite/client" />
import type { AppUpdateCheckResult, AppUpdateState } from "./lib/appUpdateTypes";
export {}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_TINYFISH_API_KEY_A?: string;
  readonly VITE_TINYFISH_API_KEY_B?: string;
}
declare global {
  const __GOOSE_EDITOR_COMPACT__: boolean;

  /**
   * 编辑器 AI 能力编译开关。主笔记本为 true；速记和原生 macOS 编辑器产物为 false。
   * 原生编辑器保留数学、Mermaid、视频和代码格式化，
   * 同时不会把 AI SDK 或 AI 菜单带入生产包。
   */
  const __GOOSE_EDITOR_AI__: boolean;

  interface GooseFs {
    readDir: (dir: string) => any[];
    readDirAsync?: (dir: string) => Promise<any[]>;
    readFile: (path: string) => string | null;
    readFileAsync?: (path: string) => Promise<string | null>;
    readFileBase64?: (path: string) => string | null;
    readFileBase64Async?: (path: string) => Promise<string | null>;
    readFileStat?: (
      path: string,
    ) => { ok: boolean; error?: string | null; content?: string | null };
    readFileStatAsync?: (
      path: string,
    ) => Promise<{ ok: boolean; error?: string | null; content?: string | null }>;
    writeFile: (path: string, content: string, encoding?: string) => boolean;
    writeFileAsync?: (path: string, content: string, encoding?: string) => Promise<boolean>;
    exists: (path: string) => boolean;
    existsAsync?: (path: string) => Promise<boolean>;
    /** 仅 mtimeMs + size，不含 atime。供本地文件夹 watch 指纹快路径使用。 */
    statAsync?: (path: string) => Promise<{ mtimeMs: number; size: number } | null>;
    realpathAsync?: (path: string) => Promise<string | null>;
    watch: (dir: string, cb: any) => any;
    unwatch: (dir: string) => void;
    mkdir: (dir: string) => boolean | Promise<boolean>;
    deleteFile: (path: string) => boolean | Promise<boolean>;
    deleteDir: (path: string) => boolean | Promise<boolean>;
    /** 永久删除 .goose/history 下的内部文件或目录（不进回收站）。 */
    purgeGoose?: (path: string) => Promise<boolean>;
    trashWithUndo?: (path: string) => Promise<string | null>;
    undoTrash?: (token: string) => Promise<boolean>;
    rename: (oldPath: string, newPath: string) => boolean | Promise<boolean>;
    writeTempFile?: (relativePath: string, contentBase64: string) => Promise<string | null>;
    cleanupTempFiles?: (prefix: string, maxAgeMs: number) => Promise<void>;
    /** 隐藏窗 printToPDF，返回 PDF base64；不可用或失败时为 null。 */
    printHtmlToPdf?: (html: string) => Promise<string | null>;
    selectDirectory?: () => Promise<string | null>;
    restoreLastDirectory?: () => Promise<string | null>;
    restoreFromTrash?: (path: string) => Promise<boolean>;
    revealItemInFolder?: (path: string) => boolean | Promise<boolean>;
    listAvailableOpenApps?: <T extends { appName: string }>(candidates: T[]) => Promise<T[]>;
    openWithApp?: (path: string, app: string) => Promise<boolean>;
    openTerminalAtPath?: (path: string, terminal?: string) => Promise<boolean>;
  }


  interface GooseDesktop {
    cancelMermaidPreview: (requestId: string) => void;
    renderMermaidPreview: (request: import("./lib/preview-renderer/contract").MermaidPreviewRequest) => Promise<string>;
    appearance: import("./lib/appearance-contract").AppearanceBridge;
    gitSync: import("./lib/git-sync-contract").GitSyncBridge;
    assetMaintenance: import("./lib/asset-maintenance-contract").AssetMaintenanceBridge;
    web: {
      search: (query: string, limit?: number) => Promise<{ engine: string; results: { title: string; url: string; snippet: string }[] }>;
      read: (url: string) => Promise<{ url: string; title: string; content: string }>;
      json: (url: string) => Promise<unknown>;
    };
    selectDirectory: (opts?: import("./lib/native-dialog-contract").DirectoryDialogOptions) => Promise<string | null>
    showOpenDialog: (opts?: import("./lib/native-dialog-contract").OpenFileDialogOptions) => Promise<string[] | null>
    showSaveDialog: (opts?: import("./lib/native-dialog-contract").SaveFileDialogOptions) => Promise<string | null>
    fsReadText: (p: string) => Promise<string>
    fsWriteText: (p: string, data: string) => Promise<void>
    fsRead: (p: string) => Promise<Uint8Array>
    fsWrite: (p: string, data: Uint8Array) => Promise<void>
    fsReadDir: (p: string) => Promise<{ name: string; isDirectory: boolean; path: string }[]>
    fsMkdir: (p: string) => Promise<void>
    fsExists: (p: string) => Promise<boolean>
    fsRealpath: (p: string) => Promise<string>
    fsStat: (p: string) => Promise<{ size: number; isDirectory: boolean; mtimeMs: number }>
    fsRename: (from: string, to: string) => Promise<void>
    fsRemove: (p: string) => Promise<void>
    fsPurgeGoose: (p: string) => Promise<void>
    fsTrashWithUndo: (p: string) => Promise<string>
    fsUndoTrash: (token: string) => Promise<string>
    restoreFromTrash: (p: string) => Promise<boolean>
    fsWatch: (p: string) => Promise<string>
    fsUnwatch: (id: string) => Promise<void>
    onFsChange: (cb: (e: { path: string; type: string }) => void) => () => void
    getUserDataPath: () => Promise<string>
    getDownloadsPath: () => Promise<string>
    saveToDownloads: (filename: string, data: Uint8Array) => Promise<string>
    joinPath: (...parts: string[]) => Promise<string>
    openUrl: (url: string) => Promise<void>
    openPath: (p: string) => Promise<void>
    showItemInFolder: (p: string) => Promise<void>
    listOpenApps: (names: string[]) => Promise<{ name: string; path: string; icon?: string }[]>
    openWithApp: (app: string, p: string) => Promise<void>
    openTerminalAtPath: (p: string, terminal?: string) => Promise<void>
    getAppVersion: () => Promise<string>
    checkForUpdate: () => Promise<AppUpdateCheckResult>
    getUpdateState: () => Promise<AppUpdateState>
    onUpdateState: (cb: (state: AppUpdateState) => void) => () => void
    downloadUpdate: (downloadUrl: string, filename: string) => Promise<{ path: string }>
    getReadyUpdate: () => Promise<string>
    installReadyUpdate: () => Promise<void>
    onBeforeUpdate: (cb: (requestId: string) => void) => () => void
    replyBeforeUpdate: (requestId: string, error: string | null) => void
    onUpdateReady: (cb: (version: string) => void) => () => void
    writeText: (t: string) => Promise<void>
    writeImage: (dataUrl: string) => Promise<void>
    readText: () => Promise<string>
    printHtmlToPdf: (html: string) => Promise<string | null>
    netFetch: (url: string, init?: { method?: string; headers?: Record<string,string>; body?: string }) => Promise<{ status: number; headers: Record<string,string>; body: string }>
    setTitle: (t: string) => Promise<void>
    getAlwaysOnTop: () => Promise<boolean>
    setAlwaysOnTop: (on: boolean) => Promise<boolean>
    syncTitleBarHeight: (height: number) => Promise<void>
    toggleMainWindow: () => Promise<void>
    showMainWindow: (action?: "none" | "search" | "settings" | "ai-panel" | "new-note") => Promise<void>
    revealSavedNote: (filePath: string) => Promise<boolean>
    toggleQuicknote: () => Promise<void>
    closeQuicknote: () => Promise<void>
    registerHotkeys: (k: { wake: string; quicknote: string; search: string }) => Promise<{ wakeOk: boolean; quicknoteOk: boolean; searchOk: boolean; paused?: boolean }>
    pauseHotkeys: () => Promise<void>
    resumeHotkeys: () => Promise<{ wakeOk: boolean; quicknoteOk: boolean; searchOk: boolean; paused?: boolean }>
    getAccessibilityStatus: () => Promise<{ platform: string; trusted: boolean }>
    requestAccessibility: () => Promise<boolean>
    onOpenSearch: (cb: () => void) => () => void
    onWorkspaceAction: (cb: (action: "search" | "settings" | "ai-panel" | "new-note") => void) => () => void
    onCloseActiveTab: (cb: () => void) => () => void
    takePendingOpenMarkdownFiles: () => Promise<string[]>
    onOpenMarkdownFiles: (cb: (files: string[]) => void) => () => void
    notify: (n: { title: string; body: string }) => Promise<void>
    getWindowContext: () => Promise<{ windowId: string; kind: "workspace" | "quicknote" }>
    createWindow: (opts: {
      mode: "blank" | "currentTab"
      tab?: { id: string; pageId: string; type?: string; workspaceId?: string }
      bounds?: { x: number; y: number; width: number; height: number }
    }) => Promise<{ windowId: string }>
    closeWindow: (windowId?: string) => Promise<void>
    minimizeWindow: () => Promise<void>
    maximizeWindow: () => Promise<void>
    toggleMaximizeWindow: () => Promise<boolean>
    isWindowMaximized: () => Promise<boolean>
    prepareWelcomeWindow: (reducedMotion?: boolean) => Promise<void>
    finishTabDrag: (opts: {
      tab: { id: string; pageId: string; type?: string; workspaceId?: string }
      cursor: { x: number; y: number }
      sourceTabCount: number
      grabOffsetX?: number
    }) => Promise<
      | { action: "none" }
      | { action: "tearOff"; windowId: string }
      | { action: "docked"; windowId: string }
    >
    tabDragMove: (cursor: { x: number; y: number }) => Promise<void>
    tabDragCancel: () => Promise<void>
    startWindowDrag: () => Promise<void>
    endWindowDrag: () => Promise<void>
    onAcceptTab: (
      cb: (payload: {
        tab: { id: string; pageId: string; type?: string; workspaceId?: string }
        contentX: number
      }) => void,
    ) => () => void
    onTabDockPreview: (cb: (payload: { contentX: number | null }) => void) => () => void
    onWindowInit: (cb: (payload: {
      takeTab?: { id: string; pageId: string; type?: string; workspaceId?: string }
      restoredTabs?: Array<{ id: string; pageId: string; type?: string; workspaceId?: string }>
    }) => void) => () => void
  }

  interface Window {
    gooseAiContext?: {
      readGlobalPrompt: () => string | null;
      listLocalSkills: () => Array<{ path: string; content: string }>;
    };
    gooseFs?: GooseFs;
    gooseDesktop?: GooseDesktop;
    gooseWeb?: {
      fetchText: (url: string) => Promise<{
        ok: true;
        url: string;
        status: number;
        contentType: string;
        text: string;
      }>;
    };
    gooseErrorReporting?: {
      readConfig: () => unknown;
      sendEnvelope: (
        url: string,
        body: string | Uint8Array,
        headers?: Record<string, string>,
      ) => Promise<{ statusCode?: number }>;
    };
    __gooseNoteReportError?: (
      error: unknown,
      extra?: Record<string, unknown>,
    ) => void;
  }
}
