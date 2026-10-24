import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import { isStandaloneFile, canTransferDocumentTab } from "@/lib/standaloneFileCapabilities";
import { createDesktopWindow, finishTabDrag } from "@/lib/electron/windowContext";
import { usePages } from "@/stores/usePages";
import { useEditorSplit } from "@/stores/useEditorSplit";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const capabilities = read("src/lib/standaloneFileCapabilities.ts");
  const windowContext = read("src/lib/electron/windowContext.ts");
  const windowArguments = read("src/lib/electron/windowArguments.ts");
  const mainWindowConfiguration = read("electron/main/windows/configuration.ts");
  const macAdhocSign = read("scripts/mac-adhoc-sign.cjs");
  const desktopCollector = read("scripts/collect-desktop-artifacts.mjs");
  const tabRail = read("src/pages/workspace/components/page/tab-rail/useTabRail.ts");
  const menu = read("src/pages/workspace/components/page/PageMenu.tsx");
  const pageMenu = read("src/pages/workspace/components/page/page-menu/usePageMenu.ts");
  const deletion = read("src/stores/pages/actions/pageMutations/delete.ts");
  const deletionErrors = read("src/lib/delete-failure.ts");
  const rename = read("src/stores/pages/actions/localFolder/rename/file.ts");
  const save = read("src/stores/pages/actions/localFolder/write/save.ts");

  check("独立文件能力以 workspace 身份识别且跨窗口载荷动态读取页面", capabilities.includes('"standalone-files"')
    && capabilities.includes("page?.workspaceId === STANDALONE_FILES_WORKSPACE")
    && capabilities.includes('import("@/stores/usePages")')
    && capabilities.includes('import("@/stores/tabs/helpers")'));
  check("主进程窗口配置只引用纯 windowArguments 模块，不引入 renderer windowContext", mainWindowConfiguration.includes('from "../../../src/lib/electron/windowArguments"')
    && !mainWindowConfiguration.includes('from "../../../src/lib/electron/windowContext"')
    && windowArguments.includes("parseGooseWindowArgs")
    && !/from ["'][^"']*(?:stores|pages|components\/editor)[^"']*["']/.test(windowArguments)
    && windowContext.includes('export * from "./windowArguments"'));
  const associationWrite = macAdhocSign.indexOf("installMarkdownDocumentTypes(app);");
  const developerIdBranch = macAdhocSign.indexOf("if (process.env.CSC_LINK) return;", associationWrite);
  const adhocSign = macAdhocSign.indexOf("run('/usr/bin/codesign'", developerIdBranch);
  check("Markdown 关联在 afterPack 签名前写入，Developer ID 分支交由 builder 签名", associationWrite >= 0
    && developerIdBranch > associationWrite && adhocSign > developerIdBranch
    && macAdhocSign.includes("File associations must be finalized before either ad-hoc or Developer ID signing."));
  check("桌面产物 collector 只复制，不再修改 Info.plist 文件关联", !desktopCollector.includes("CFBundleDocumentTypes")
    && !desktopCollector.includes("plutil")
    && !desktopCollector.includes("installMarkdownDocumentTypes"));
  check("独立标签的窗口新建与拖出共用传输保护", windowContext.includes("canTransferDocumentTab(opts.tab)")
    && windowContext.includes("canTransferDocumentTab(opts.tab)")
    && tabRail.includes("!isStandaloneFile(page)")
    && tabRail.includes("!canTransferTab(tab)"));
  check("页面菜单保留独立文件图片导出并隐藏删除入口", !menu.includes("{!isStandaloneFile(page) && (<PopoverAction")
    && /!isStandaloneFile\(page\)[\s\S]{0,300}deletePageWithUndo\(activePageId\)/.test(menu));
  check("读取失败页保留导出入口但不能弹出图片设置", menu.includes("if (page.localReadState !== \"error\") setThemeSelectorOpen(true)"));
  check("删除与重命名底层拒绝独立文件", /if \(isStandaloneFile\(page\)\)[\s\S]{0,140}outside the allowed folders/.test(deletion)
    && deletionErrors.includes("outside the allowed")
    && /!page\.localFilePath \|\| isStandaloneFile\(page\)/.test(rename));
  check("导入上下文来自当前页面所属 notebook，独立文件不借用侧栏旧库", pageMenu.includes("page ? (notebooks[page.workspaceId]?.id ?? null) : sidebarNotebookId")
    && pageMenu.includes("if (!activeNotebookId)")
    && pageMenu.includes("preserveStructure: isLocalFolderNotebook"));
  const pageMenuTransferGuard = pageMenu.match(/const canOpenInNewWindow =[\s\S]{0,260};/)?.[0] ?? "";
  check("页面菜单对混合分屏标签检查所有页面后才允许转移", pageMenu.includes('import { collectTabPageIds } from "@/stores/tabs/helpers"')
    && pageMenuTransferGuard.includes("activeTab && collectTabPageIds(activeTab).every")
    && pageMenuTransferGuard.includes("!isStandaloneFile(getPage(id))"));
  check("独立文件保存保留 data 图片，不生成旁置 assets 写入", /isStandaloneFile\(page\) \? \[\] : collectLocalImageWrites/.test(save)
    && save.includes("pendingImageWrites.map(({ imagePath, base64Data })"));

  const originalWindow = globalThis.window;
  const originalPages = usePages.getState().pages;
  const originalSplits = useEditorSplit.getState().byTabId;
  let createCalls = 0;
  let dragCalls = 0;
  const mockWindow = {
    gooseDesktop: {
      createWindow: async () => { createCalls += 1; return { windowId: "new-window" }; },
      finishTabDrag: async () => { dragCalls += 1; return { action: "tearOff", windowId: "new-window" }; },
    },
  } as unknown as Window;
  const standalonePage = { id: "external:/tmp/standalone.md", workspaceId: "standalone-files" };
  const notebookPage = { id: "notebook-page", workspaceId: "notebook-1" };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: mockWindow });
    usePages.setState({ pages: {
      [standalonePage.id]: standalonePage as never,
      [notebookPage.id]: notebookPage as never,
    } });

    const blockedWindow = await createDesktopWindow({ mode: "currentTab", tab: { id: "standalone-tab", pageId: standalonePage.id } });
    const blockedDrag = await finishTabDrag({ tab: { id: "standalone-tab", pageId: standalonePage.id }, cursor: { x: 0, y: 0 }, sourceTabCount: 2 });
    const allowedWindow = await createDesktopWindow({ mode: "currentTab", tab: { id: "regular-tab", pageId: notebookPage.id } });
    const allowedDrag = await finishTabDrag({ tab: { id: "regular-tab", pageId: notebookPage.id }, cursor: { x: 0, y: 0 }, sourceTabCount: 2 });
    useEditorSplit.setState({ byTabId: {
      ...originalSplits,
      "mixed-tab": {
        root: { kind: "group", id: "mixed-root", orientation: "horizontal", sizes: [50, 50], children: [
          { kind: "leaf", id: "mixed-regular-leaf", pageId: notebookPage.id },
          { kind: "leaf", id: "mixed-standalone-leaf", pageId: standalonePage.id },
        ] },
        focusedLeafId: "mixed-regular-leaf",
        zoomedLeafId: null,
      },
    } });
    const mixedWindow = await createDesktopWindow({ mode: "currentTab", tab: { id: "mixed-tab", pageId: notebookPage.id } });
    const mixedDrag = await finishTabDrag({ tab: { id: "mixed-tab", pageId: notebookPage.id }, cursor: { x: 0, y: 0 }, sourceTabCount: 2 });

    check("真实单文件能力识别并阻止单标签跨窗口与拖出", isStandaloneFile(standalonePage)
      && blockedWindow === null && blockedDrag.action === "none"
      && createCalls === 1 && dragCalls === 1);
    check("普通笔记标签仍可跨窗口与拖出", !isStandaloneFile(notebookPage)
      && allowedWindow?.windowId === "new-window" && allowedDrag.action === "tearOff"
      && createCalls === 1 && dragCalls === 1);
    check("含独立页分屏的复合标签也不能跨窗口或拖出", mixedWindow === null
      && mixedDrag.action === "none" && createCalls === 1 && dragCalls === 1);
  } catch (error) {
    check("跨窗口单文件保护调用链", false, error instanceof Error ? error.message : String(error));
  } finally {
    usePages.setState({ pages: originalPages });
    useEditorSplit.setState({ byTabId: originalSplits });
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  return checker.failed;
}
