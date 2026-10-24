import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  canonicalLocalPath,
  canonicalRelativePath,
  comparisonLocalPath,
  isCanonicalPathInside,
} from "@/lib/canonicalLocalPath";
import { openStandaloneMarkdownPage, STANDALONE_FILES_WORKSPACE } from "@/lib/openStandaloneMarkdown";
import { usePages } from "@/stores/usePages";
import { assertLocalPageReadable } from "@/stores/pages/actions/localFolder/write/emptySaveGuard";
import { HostAdapter } from "@/lib/host/adapter";
import { acknowledgeRecoveryEntry, recordRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { hasExternalDiskChange } from "@/stores/pages/actions/localFolder/write/conflict";
import { setLocalMdSnapshot, deleteLocalMdSnapshot } from "@/lib/local-md-snapshot";
import { recordHistorySnapshotDetailed } from "@/lib/history/snapshot";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const associated = read("src/lib/openAssociatedMarkdown.ts");
  const standalone = read("src/lib/openStandaloneMarkdown.ts");
  const history = read("src/lib/history/notebookHistory.ts");
  const historyBackend = read("src/lib/history/backend.ts");
  const activation = read("src/stores/tabs/activationActions.ts");
  const openingTabs = read("src/stores/tabs/openingActions.ts");
  const electronOpen = read("electron/main/openMarkdownFiles.ts");
  const allowlist = read("electron/main/allowlist.ts");
  const preload = read("electron/preload/index.ts");
  const hooks = read("src/hooks/useDesktopFileEvents.ts");
  const save = read("src/stores/pages/actions/localFolder/write/save.ts");
  const selector = read("src/stores/pages/slices/selectorsSlice.ts");
  const updates = read("src/stores/pages/slices/updateSlice.ts");
  const pagePersistence = read("src/stores/pages/persistence.ts");
  const saveGuards = read("src/bootstrap/saveGuards.ts");
  const closingTabs = read("src/stores/tabs/closingActions.ts");
  const tabHelpers = read("src/stores/tabs/helpers.ts");
  const flushQueue = read("src/stores/pages/folderSyncFlush.ts");
  const watchLifecycle = read("src/pages/workspace/hooks/local-folder-watch/useLocalFolderWatchLifecycle.tsx");
  const layoutState = read("src/pages/workspace/layout/useWorkspaceLayoutState.tsx");

  check("独立 Markdown 以会话 workspace 保存原路径", STANDALONE_FILES_WORKSPACE === "standalone-files"
    && standalone.includes("Session-only documents")
    && standalone.includes("workspaceId: STANDALONE_FILES_WORKSPACE")
    && standalone.includes("localFilePath: filePath"));
  check("可编辑保存路径直接取 localFilePath", selector.includes("getLocalFilePath: (pageId)")
    && selector.includes("return page?.localFilePath || null")
    && save.includes("assertLocalPageReadable(page, page.localFilePath ?? \"\")"));
  check("独立文件内容编辑进入本地自动保存队列", pagePersistence.includes("if (page.localFilePath) return true")
    && updates.includes("const isLocal = isLocalFolderPage(page)")
    && updates.includes("!silent &&\n          isLocal &&")
    && updates.includes("queueLocalPageSave(id, contentForSave, get"));
  check("独立文件手动保存与应用关闭刷新共用待保存队列", saveGuards.includes("await usePages.getState().flushPendingLocalSaves()")
    && saveGuards.includes("const isLocalFile =")
    && saveGuards.includes("void runFlushOnce().catch(reportFlushFailure)")
    && ["visibilitychange", "pagehide", "beforeunload"].every((event) => saveGuards.includes(`addEventListener(\"${event}\"`))
    && flushQueue.includes("...localSavePageIds()"));
  check("关闭标签页会刷新该页的本地待保存内容", closingTabs.includes("flushClosedPageSaves(toFlush)")
    && tabHelpers.includes("await pagesStore.flushPendingLocalSaveByPageId(pageId)")
    && flushQueue.includes("flushPendingLocalSaveByPageIdInternal"));
  check("重复打开复用页面且不覆盖未保存编辑", standalone.includes("if (existing)")
    && standalone.includes("Never replace an open editor's unsaved content")
    && standalone.includes("return existing.id"));

  const originalWindow = globalThis.window;
  const originalPages = usePages.getState().pages;
  const originalDb = HostAdapter.db;
  const recoveryDocs = new Map<string, { _id: string; _rev: string; data: unknown }>();
  HostAdapter.db = {
    ...originalDb,
    put: (id: string, data: unknown) => {
      const doc = { _id: id, _rev: "1", data };
      recoveryDocs.set(id, doc);
      return { id, ok: true, rev: doc._rev };
    },
    get: <T,>(id: string) => (recoveryDocs.get(id) as { _id: string; _rev?: string; data: T } | undefined) ?? null,
    remove: (id: string) => ({ id, ok: recoveryDocs.delete(id) }),
    allDocs: <T,>(prefix = "") => [...recoveryDocs.values()]
      .filter((doc) => doc._id.startsWith(prefix)) as Array<{ _id: string; _rev?: string; data: T }>,
  };
  const filePath = "/tmp/thinkly-associated-open-check.md";
  const mockWindow = {
    gooseFs: {
      readFileStatAsync: async () => ({ ok: true, content: "# From disk" }),
      statAsync: async () => ({ size: 11, mtimeMs: 1 }),
    },
  } as unknown as Window;
  let recoveredId: string | null = null;
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: mockWindow });
    usePages.setState({ pages: {} });
    const id = await openStandaloneMarkdownPage(filePath);
    const opened = usePages.getState().pages[id];
    check("真实打开函数创建可编辑独立页面并保留原路径", id === `external:${filePath}`
      && opened?.workspaceId === "standalone-files"
      && opened?.localFilePath === filePath
      && opened?.localReadState !== "error");
    usePages.setState({ pages: { ...usePages.getState().pages, [id]: { ...opened, content: [{ type: "paragraph", content: [{ type: "text", text: "Unsaved" }] }] } } });
    const reopenedId = await openStandaloneMarkdownPage(filePath);
    check("真实重复打开保留现有页面和未保存内容", reopenedId === id
      && JSON.stringify(usePages.getState().pages[id]?.content).includes("Unsaved"));

    const deniedPath = "/tmp/thinkly-associated-open-denied.md";
    (mockWindow.gooseFs as GooseFs).readFileStatAsync = async () => ({
      ok: false, error: "EACCES: permission denied",
    });
    const deniedId = await openStandaloneMarkdownPage(deniedPath);
    const deniedPage = usePages.getState().pages[deniedId];
    let deniedSaveBlocked = false;
    try { assertLocalPageReadable(deniedPage, deniedPath); }
    catch { deniedSaveBlocked = true; }
    check("真实 EACCES 读取失败生成 error 页并阻止保存覆盖", deniedPage?.localReadState === "error"
      && deniedPage.localReadError?.includes("EACCES")
      && deniedPage.localFilePath === deniedPath
      && deniedSaveBlocked);
    const historyDocsBefore = [...recoveryDocs.keys()].filter((key) => key.startsWith("gn:hist-")).length;
    const deniedHistory = await recordHistorySnapshotDetailed({
      pageId: deniedId, workspaceId: "standalone-files",
      content: (deniedPage?.content ?? []) as never, trigger: "manual",
    });
    check("读取失败的独立页不记录历史版本", deniedHistory.status === "unavailable"
      && [...recoveryDocs.keys()].filter((key) => key.startsWith("gn:hist-")).length === historyDocsBefore);

    const snapshotPath = "/tmp/thinkly-associated-open-snapshot.md";
    setLocalMdSnapshot(snapshotPath, "# Snapshot");
    let snapshotReadFailed = false;
    try { await hasExternalDiskChange(snapshotPath, "page-snapshot", "pre-save"); }
    catch { snapshotReadFailed = true; }
    check("有原始快照但权限读取失败时拒绝保存", snapshotReadFailed);
    deleteLocalMdSnapshot(snapshotPath);

    const historyPageId = "verify-history-lock-page";
    const originalGet = HostAdapter.db.get;
    let rejectHistoryReadOnce = true;
    HostAdapter.db.get = <T,>(id: string) => {
      if (id === `gn:hist-idx:${historyPageId}` && rejectHistoryReadOnce) {
        rejectHistoryReadOnce = false;
        throw new Error("simulated history read failure");
      }
      return originalGet<T>(id);
    };
    let firstHistoryRejected = false;
    try {
      await recordHistorySnapshotDetailed({
        pageId: historyPageId, workspaceId: "default",
        content: [{ type: "paragraph", content: [{ type: "text", text: "History" }] }] as never,
        trigger: "manual",
      });
    } catch { firstHistoryRejected = true; }
    const secondHistory = await recordHistorySnapshotDetailed({
      pageId: historyPageId, workspaceId: "default",
      content: [{ type: "paragraph", content: [{ type: "text", text: "History" }] }] as never,
      trigger: "manual",
    });
    HostAdapter.db.get = originalGet;
    check("历史读取异常后锁释放且后续快照可继续", firstHistoryRejected && secondHistory.status === "created");

    const recoveryPath = "/tmp/thinkly-associated-open-recovery.md";
    recoveredId = `external:${recoveryPath}`;
    const draft = [{ type: "paragraph", content: [{ type: "text", text: "Draft restored" }] }];
    const recoveryEntry = recordRecoveryEntry({ source: "local-file", id: recoveredId, content: draft as never });
    (mockWindow.gooseFs as GooseFs).readFileStatAsync = async () => ({ ok: true, content: "# Disk version" });
    const recoveredPageId = await openStandaloneMarkdownPage(recoveryPath);
    check("真实打开会把同文件未落盘恢复稿放回编辑器且标为待保存", recoveredPageId === recoveredId
      && JSON.stringify(usePages.getState().pages[recoveredId]?.content).includes("Draft restored")
      && usePages.getState().dirtyLocalPageIds[recoveredId] === true);
    if (recoveryEntry) acknowledgeRecoveryEntry("local-file", recoveredId, recoveryEntry.revision);
  } catch (error) {
    check("真实独立文件打开与重复打开", false, error instanceof Error ? error.message : String(error));
  } finally {
    usePages.setState({ pages: originalPages });
    if (recoveredId) {
      const entry = recoveryDocs.get(`gn:recovery:v2:local-file:${encodeURIComponent(recoveredId)}`)?.data as { entry?: { revision?: number } } | undefined;
      if (entry?.entry?.revision) acknowledgeRecoveryEntry("local-file", recoveredId, entry.entry.revision);
    }
    recoveryDocs.clear();
    HostAdapter.db = originalDb;
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  let readFailureBlocksSave = false;
  try { assertLocalPageReadable({ localReadState: "error" } as never, filePath); }
  catch { readFailureBlocksSave = true; }
  check("读取失败状态会阻止保存覆盖原文件", readFailureBlocksSave
    && save.includes("assertLocalPageReadable(get().pages[pageId], filePath)"));
  check("权限错误显示系统权限提示并提供重试", associated.includes("EPERM|EACCES|permission|access denied")
    && associated.includes("reloadLocalPageFromDisk(pageId)"));

  check("macOS 系统卷路径映射回标准路径", canonicalLocalPath("/System/Volumes/Data/Users/a/n.md") === "/Users/a/n.md");
  check("Windows 分隔符与大小写比较", comparisonLocalPath("C:\\Notes\\A.md", true) === "c:/notes/a.md"
    && isCanonicalPathInside("C:\\Notes\\A.md", "c:/notes", true));
  check("UNC 路径保留服务器与共享层级并可判定包含关系", canonicalLocalPath("\\\\server\\share\\Notes\\a.md") === "//server/share/Notes/a.md"
    && isCanonicalPathInside("\\\\server\\share\\Notes\\a.md", "\\\\server\\share\\Notes", true));
  check("POSIX 比较保留大小写且目录判断不接受同前缀兄弟目录", comparisonLocalPath("/Notes/A.md", false) === "/Notes/A.md"
    && !isCanonicalPathInside("/Notes-old/a.md", "/Notes", false)
    && canonicalRelativePath("/Notes", "/Notes/Sub/a.md", false) === "Sub/a.md");

  check("无挂载库的文件走独立打开，有挂载库优先匹配且最长根优先", associated.includes("if (!notebook)")
    && associated.includes("openStandaloneMarkdownPage(trimmed)")
    && associated.includes("matches.sort")
    && associated.includes("right.localPath?.length"));
  check("跨库打开通过永久标签同步目标库，避免提前切库丢失当前标签", associated.includes("openPermanentTab(pageId)")
    && !associated.includes("activateNotebook(notebookId)")
    && openingTabs.includes("get().syncNotebookForPage(pageId)")
    && activation.includes("setActiveNotebook(page.workspaceId)"));
  check("独立 workspace 不触发不存在笔记本的切库", activation.includes("if (notebookStore.notebooks[page.workspaceId] && notebookStore.activeNotebookId !== page.workspaceId)")
    && standalone.includes("STANDALONE_FILES_WORKSPACE"));
  check("单文件活动页在激活和窗口聚焦时检查新鲜度", watchLifecycle.includes("checkLocalPageFreshness(activePageId)")
    && watchLifecycle.includes("const pid = usePages.getState().activePageId")
    && watchLifecycle.includes("window.addEventListener(\"focus\", check)"));
  check("AI 上下文跟随当前页面所属笔记本，独立页不借用上一库", layoutState.includes("const aiNotebookId = page ? (pageNotebook?.id ?? null) : activeNotebookId")
    && layoutState.includes("Boolean(aiNotebookId)"));

  check("独立文件不进入笔记本历史存储", historyBackend.includes("if (!notebook?.localPath) return dbBackend")
    && history.includes("export async function portableHistoryIds"));
  check("标签状态可持久化，但独立文件页只保存在当前运行态", read("src/stores/tabs/persistence.ts").includes("window.localStorage.setItem")
    && standalone.includes("Session-only documents")
    && !standalone.includes("persistPageSnapshot"));
  check("Electron 接收 OS 文件事件并交给渲染进程按序打开", electronOpen.includes('app.on("open-file"')
    && electronOpen.includes("takePendingOpenMarkdownFiles")
    && preload.includes('invoke("desktop:takePendingOpenMarkdownFiles")')
    && hooks.includes("openAssociatedMarkdownFiles(files)"));
  check("Electron 校验 Markdown、真实路径与授权名单", electronOpen.includes("realpathSync.native")
    && electronOpen.includes("isMarkdownDocumentPath(resolved)")
    && electronOpen.includes("allowAssociatedMarkdownFile(resolved)")
    && allowlist.includes("hasUnsafeSegments"));

  return checker.failed;
}
